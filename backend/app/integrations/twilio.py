"""Twilio telephony provider adapter for Parchi AI.
Maps Twilio voice webhooks to the internal /webhooks/voice/{clinic_id} format.
Features:
  1. Real Twilio HMAC-SHA1 signature verification.
  2. Pre-generated audio caching for templated answers (hours, address, fees, urgent, handoff).
  3. Filler audio ("Ek second, main dekh rahi hoon") when reply latency > 1.5 seconds.
  4. Per-clinic monthly minute cap to prevent bill overruns.
"""
import os
import hmac
import hashlib
import base64
import time
from datetime import datetime, timezone
from pathlib import Path
from collections import defaultdict
from sqlalchemy.orm import Session

from ..config import TWILIO_AUTH_TOKEN, VOICE_MONTHLY_MINUTE_CAP, VOICE_SECRET
from ..models import Clinic, Event, Patient
from .. import receptionist

# Audio cache directory (use /tmp when running on Vercel read-only filesystem)
AUDIO_CACHE_DIR = (
    Path("/tmp/parchi_static/audio")
    if os.getenv("VERCEL")
    else Path(__file__).resolve().parent.parent / "static" / "audio"
)
AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)

FILLER_TEXT = "Ek second, main dekh rahi hoon"

# In-memory monthly minute usage tracker: (clinic_id, YYYY-MM) -> minutes (float)
_clinic_monthly_minutes: dict[tuple[int, str], float] = defaultdict(float)


# ---------------------------------------------------------------------------
# 1. Twilio Signature Verification (RFC 2104 / Twilio Request Validation)
# ---------------------------------------------------------------------------
def compute_twilio_signature(url: str, params: dict, auth_token: str | None = None) -> str:
    """Computes Twilio X-Twilio-Signature header value.
    Sorts POST parameter keys alphabetically, appends key and value to URL,
    and computes HMAC-SHA1 with the auth_token.
    """
    token = auth_token or TWILIO_AUTH_TOKEN
    s = url
    if params:
        for k in sorted(params.keys()):
            s += f"{k}{params[k]}"
    mac = hmac.new(token.encode("utf-8"), s.encode("utf-8"), hashlib.sha1)
    return base64.b64encode(mac.digest()).decode("utf-8")


def verify_twilio_signature(url: str, params: dict, signature: str, auth_token: str | None = None) -> bool:
    """Verifies that an incoming HTTP request originated from Twilio."""
    if not signature:
        return False
    expected = compute_twilio_signature(url, params, auth_token)
    return hmac.compare_digest(expected, signature)


# ---------------------------------------------------------------------------
# 2. Webhook Mapping: Twilio Form Data -> Internal Voice Format
# ---------------------------------------------------------------------------
def map_twilio_to_internal(params: dict) -> dict:
    """Maps Twilio voice POST payload to the existing internal voice schema:
    {
      "call_id": CallSid,
      "from": Normalized phone number,
      "speech": SpeechResult or empty,
      "confidence": float between 0.0 and 1.0
    }
    """
    raw_from = str(params.get("From", "")).strip()
    # Normalize phone: remove leading +91 or + if present
    normalized_phone = raw_from
    if normalized_phone.startswith("+91"):
        normalized_phone = normalized_phone[3:]
    elif normalized_phone.startswith("+"):
        normalized_phone = normalized_phone[1:]

    confidence = 1.0
    if "Confidence" in params:
        try:
            confidence = float(params["Confidence"])
        except (ValueError, TypeError):
            confidence = 1.0

    return {
        "call_id": params.get("CallSid", f"tw_{int(time.time()*1000)}"),
        "from": normalized_phone,
        "speech": str(params.get("SpeechResult", "")).strip(),
        "confidence": max(0.0, min(1.0, confidence))
    }


# ---------------------------------------------------------------------------
# 3. Pre-generated Audio Cache for Templated Answers
# ---------------------------------------------------------------------------
class AudioCacheManager:
    @staticmethod
    def _cache_path(clinic_id: int, template_type: str, lang: str = "en") -> Path:
        return AUDIO_CACHE_DIR / f"clinic_{clinic_id}_{template_type}_{lang}.wav"

    @classmethod
    def get_cached_audio_path(cls, clinic_id: int, template_type: str, lang: str = "en") -> Path | None:
        p = cls._cache_path(clinic_id, template_type, lang)
        return p if p.exists() else None

    @classmethod
    def get_cached_audio_url(cls, clinic_id: int, template_type: str, lang: str = "en") -> str | None:
        p = cls.get_cached_audio_path(clinic_id, template_type, lang)
        if p and p.exists():
            return f"/static/audio/{p.name}"
        return None

    @classmethod
    def pregenerate_clinic_audio(
        cls,
        clinic_id: int,
        clinic_name: str,
        hours: str = "",
        address: str = "",
        fees: str = ""
    ):
        """Generates static cached audio files for hours, address, fees, urgent, handoff, and filler.
        Uses valid RIFF WAV header bytes to simulate cached synthesized audio without runtime TTS fees.
        """
        # Minimal valid 44-byte 8kHz 16-bit mono PCM WAV header
        header = (
            b"RIFF\x2c\x00\x00\x00WAVEfmt \x10\x00\x00\x00"
            b"\x01\x00\x01\x00\x40\x1f\x00\x00\x80\x3e\x00\x00"
            b"\x02\x00\x10\x00data\x08\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
        )
        templates = ["hours", "address", "fees", "urgent", "handoff", "filler"]
        for t in templates:
            for l in ("en", "hinglish", "hi", "mr"):
                p = cls._cache_path(clinic_id, t, l)
                p.write_bytes(header)

    @classmethod
    def clear_cache(cls, clinic_id: int | None = None):
        for f in AUDIO_CACHE_DIR.glob("*.wav"):
            if clinic_id is None or f.name.startswith(f"clinic_{clinic_id}_"):
                try:
                    f.unlink()
                except OSError:
                    pass


# ---------------------------------------------------------------------------
# 4. Per-Clinic Monthly Minute Cap Tracker
# ---------------------------------------------------------------------------
def _current_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def get_monthly_minutes(clinic_id: int) -> float:
    return _clinic_monthly_minutes.get((clinic_id, _current_month()), 0.0)


def record_call_duration(clinic_id: int, seconds: int):
    """Increments the clinic's monthly voice usage by seconds / 60.0."""
    month = _current_month()
    _clinic_monthly_minutes[(clinic_id, month)] += (max(0, seconds) / 60.0)


def check_minute_cap(clinic_id: int) -> bool:
    """Returns True if clinic is under cap, False if cap is reached."""
    used = get_monthly_minutes(clinic_id)
    return used < VOICE_MONTHLY_MINUTE_CAP


def reset_minute_cap(clinic_id: int | None = None):
    """Testing helper to reset per-clinic monthly minutes."""
    if clinic_id:
        for k in list(_clinic_monthly_minutes.keys()):
            if k[0] == clinic_id:
                del _clinic_monthly_minutes[k]
    else:
        _clinic_monthly_minutes.clear()


# ---------------------------------------------------------------------------
# 5. TwiML Generation
# ---------------------------------------------------------------------------
def build_twiml_response(
    say_text: str | None = None,
    audio_url: str | None = None,
    transfer_to: str | None = None,
    filler_audio_url: str | None = None,
    action_url: str | None = None,
    hangup: bool = False
) -> str:
    """Builds standard compliant TwiML XML."""
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', "<Response>"]

    # 1. If filler was triggered (latency > 1.5s), play/speak filler first
    if filler_audio_url:
        lines.append(f"    <Play>{filler_audio_url}</Play>")

    # 2. If call transfer is required (urgent or staff handoff)
    if transfer_to:
        if audio_url:
            lines.append(f"    <Play>{audio_url}</Play>")
        elif say_text:
            lines.append(f"    <Say>{say_text}</Say>")
        lines.append(f"    <Dial>{transfer_to}</Dial>")
    elif hangup:
        if audio_url:
            lines.append(f"    <Play>{audio_url}</Play>")
        elif say_text:
            lines.append(f"    <Say>{say_text}</Say>")
        lines.append("    <Hangup/>")
    else:
        # Normal conversational turn: gather user's next speech input
        action_attr = f' action="{action_url}"' if action_url else ""
        lines.append(f'    <Gather input="speech" method="POST"{action_attr} timeout="3">')
        if audio_url:
            lines.append(f"        <Play>{audio_url}</Play>")
        elif say_text:
            lines.append(f"        <Say>{say_text}</Say>")
        lines.append("    </Gather>")
        lines.append("    <Say>We did not hear any response. Goodbye.</Say>")
        lines.append("    <Hangup/>")

    lines.append("</Response>")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# 6. Main Twilio Webhook Handler
# ---------------------------------------------------------------------------
def handle_twilio_turn(
    db: Session,
    clinic: Clinic,
    params: dict,
    elapsed_seconds: float = 0.0,
    action_url: str | None = None
) -> dict:
    """Processes an incoming Twilio voice webhook turn:
      1. Checks monthly minute cap. If exceeded, forwards immediately to staff.
      2. Maps Twilio payload to internal format.
      3. Invokes receptionist logic.
      4. Detects if templated audio is cached.
      5. Plays filler audio if latency > 1.5 seconds.
      6. Formats response as TwiML XML.
    """
    # Check monthly minute cap
    if not check_minute_cap(clinic.id):
        staff = clinic.staff_phone or "112"
        twiml = build_twiml_response(
            say_text="Monthly voice limit reached. Transferring to clinic staff.",
            transfer_to=staff
        )
        return {
            "twiml": twiml,
            "say": "Monthly voice limit reached. Transferring to clinic staff.",
            "transfer_to": staff,
            "cached_audio": False,
            "filler_played": False,
            "cap_reached": True
        }

    # Map parameters
    internal = map_twilio_to_internal(params)
    s = receptionist.get_session(db, clinic.id, "voice", internal["call_id"])
    speech = internal["speech"]
    conf = internal["confidence"]

    handoff = False
    say_text = ""
    intent = "other"

    if not speech or conf < 0.5:
        say_text, handoff = receptionist.unclear_turn(db, s)
        intent = "handoff"
    else:
        p = db.query(Patient).filter_by(clinic_id=clinic.id, phone=internal["from"]).first()
        say_text = receptionist.reply(db, clinic, s, p, speech)
        ev = db.get(Event, s.event_id) if s.event_id else None
        if ev:
            intent = ev.intent
            handoff = bool(ev.outcome in ("handoff", "urgent"))

    transfer_to = clinic.staff_phone if (handoff and clinic.staff_phone) else None

    # Check for pre-generated cached audio
    L = receptionist.lang(speech or "")
    audio_url = None
    if intent in ("hours", "address", "fees", "urgent", "handoff"):
        audio_url = AudioCacheManager.get_cached_audio_url(clinic.id, intent, L)

    # Check filler audio condition (elapsed > 1.5 seconds)
    filler_url = None
    filler_played = False
    if elapsed_seconds > 1.5:
        filler_url = AudioCacheManager.get_cached_audio_url(clinic.id, "filler", L)
        if not filler_url:
            filler_url = f"/static/audio/filler_{L}.wav"
        filler_played = True

    twiml = build_twiml_response(
        say_text=say_text,
        audio_url=audio_url,
        transfer_to=transfer_to,
        filler_audio_url=filler_url,
        action_url=action_url
    )

    return {
        "twiml": twiml,
        "internal_payload": internal,
        "say": say_text,
        "transfer_to": transfer_to,
        "cached_audio": bool(audio_url),
        "filler_played": filler_played,
        "cap_reached": False
    }
