"""Telephony adapter endpoint. A provider (Twilio/Exotel/Knowlarity) posts each speech turn here; we answer with text to speak
(and a transfer number on handoff). Real SIP/call-forwarding setup and TTS/STT are done by the provider, not in this repo."""
import hashlib, hmac, time, urllib.parse, base64
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from sqlalchemy.orm import Session
from ..config import VOICE_SECRET
from ..database import get_db
from ..models import Clinic, Event, Patient, User
from .. import receptionist
from ..integrations import twilio as twilio_integration
from ..integrations import livekit as livekit_integration
from ..integrations import deepgram as deepgram_integration

r = APIRouter()
@r.post("/webhooks/voice/{clinic_id}")
async def voice(clinic_id: int, req: Request, x_signature: str = Header(default=""), db: Session = Depends(get_db)):
    raw = await req.body()
    if not hmac.compare_digest(x_signature, hmac.new(VOICE_SECRET.encode(), raw, hashlib.sha256).hexdigest()): raise HTTPException(401, "Bad signature")
    d = await req.json(); c = db.get(Clinic, clinic_id)
    if not (c and d.get("call_id") and d.get("from")): raise HTTPException(422, "Invalid payload")
    s = receptionist.get_session(db, c.id, "voice", d["call_id"])
    speech, conf = (d.get("speech") or "").strip(), float(d.get("confidence", 1))
    if not speech or conf < 0.5: say, handoff = receptionist.unclear_turn(db, s)
    else:
        p = db.query(Patient).filter_by(clinic_id=c.id, phone=d["from"]).first()
        if p and p.opted_out is False and not p.consent: pass
        say = receptionist.reply(db, c, s, p, speech)
        ev = db.get(Event, s.event_id) if s.event_id else None; handoff = bool(ev and ev.outcome in ("handoff", "urgent"))
    return {"say": say, "transfer_to": c.staff_phone if handoff and c.staff_phone else None, "hangup": False}

@r.post("/webhooks/voice/twilio/{clinic_id}")
async def twilio_voice(
    clinic_id: int,
    req: Request,
    x_twilio_signature: str = Header(default=""),
    db: Session = Depends(get_db)
):
    c = db.get(Clinic, clinic_id)
    if not c:
        raise HTTPException(404, "Clinic not found")

    raw = await req.body()
    content_type = req.headers.get("content-type", "")
    if content_type.startswith("application/json"):
        params = await req.json()
    else:
        parsed = urllib.parse.parse_qs(raw.decode("utf-8"))
        params = {k: v[0] if isinstance(v, list) and len(v) == 1 else v for k, v in parsed.items()}

    url = str(req.url)

    if not twilio_integration.verify_twilio_signature(url, params, x_twilio_signature):
        raise HTTPException(401, "Invalid Twilio signature")

    # Check simulated delay header (useful for filler latency tests)
    sim_delay = float(req.headers.get("X-Simulated-Delay", 0.0))
    res = twilio_integration.handle_twilio_turn(
        db, c, params,
        elapsed_seconds=sim_delay,
        action_url=url
    )
    return Response(content=res["twiml"], media_type="application/xml")

@r.post("/webhooks/voice/twilio/{clinic_id}/status")
async def twilio_status(
    clinic_id: int,
    req: Request,
    x_twilio_signature: str = Header(default=""),
    db: Session = Depends(get_db)
):
    c = db.get(Clinic, clinic_id)
    if not c:
        raise HTTPException(404, "Clinic not found")

    raw = await req.body()
    content_type = req.headers.get("content-type", "")
    if content_type.startswith("application/json"):
        params = await req.json()
    else:
        parsed = urllib.parse.parse_qs(raw.decode("utf-8"))
        params = {k: v[0] if isinstance(v, list) and len(v) == 1 else v for k, v in parsed.items()}

    url = str(req.url)

    if not twilio_integration.verify_twilio_signature(url, params, x_twilio_signature):
        raise HTTPException(401, "Invalid Twilio signature")

    try:
        duration = int(params.get("CallDuration", 0))
    except (ValueError, TypeError):
        duration = 0

    if duration > 0:
        twilio_integration.record_call_duration(clinic_id, duration)

    return {"status": "ok", "duration_recorded": duration, "monthly_minutes": twilio_integration.get_monthly_minutes(clinic_id)}


@r.post("/voice/livekit/token")
async def livekit_token(
    req: Request,
    db: Session = Depends(get_db)
):
    """Generates an RFC 7519 HMAC-SHA256 LiveKit AccessToken for WebRTC Voice Agent rooms."""
    data = {}
    if req.headers.get("content-type", "").startswith("application/json"):
        try:
            data = await req.json()
        except Exception:
            data = {}
    clinic_id = data.get("clinic_id") or 1
    c = db.get(Clinic, clinic_id) or db.query(Clinic).first()
    if not c:
        raise HTTPException(404, "Clinic not found")

    room = data.get("room") or f"parchi-clinic-{c.id}"
    identity = data.get("identity") or f"caller-{int(time.time())}"
    name = data.get("name") or "Clinic Caller"

    cfg = livekit_integration.get_clinic_livekit_config(db, c.id)
    token_info = livekit_integration.create_livekit_token(
        clinic_id=c.id,
        room_name=room,
        participant_identity=identity,
        participant_name=name,
        api_key=cfg.get("api_key"),
        api_secret=cfg.get("api_secret"),
        livekit_url=cfg.get("url"),
        ttl_seconds=3600,
        metadata={"clinic_id": c.id, "clinic_name": c.name},
    )
    token_info["configured"] = cfg.get("configured", False)
    token_info["clinic_id"] = c.id
    token_info["clinic_name"] = c.name
    token_info["participant_identity"] = identity
    return token_info


@r.post("/voice/livekit/webhook")
async def livekit_webhook(
    req: Request,
    authorization: str = Header(default=""),
    db: Session = Depends(get_db)
):
    """Processes incoming LiveKit WebRTC server events (participant joined, audio stream active)."""
    raw = await req.body()
    c = db.query(Clinic).first()
    api_secret = livekit_integration.get_clinic_livekit_config(db, c.id if c else 1).get("api_secret")

    # If auth header provided, verify token
    token_payload = livekit_integration.verify_livekit_token(authorization, api_secret) if authorization else None

    try:
        data = await req.json()
    except Exception:
        data = {}

    event_type = data.get("event", "unknown")
    room_name = data.get("room", {}).get("name", "") if isinstance(data.get("room"), dict) else ""
    return {
        "status": "received",
        "event": event_type,
        "room": room_name,
        "verified": token_payload is not None,
    }


@r.post("/voice/deepgram/transcribe")
async def deepgram_transcribe(
    req: Request,
    language: str = "hi",
    db: Session = Depends(get_db)
):
    """Transcribes an audio buffer using Deepgram Nova-2 speech-to-text engine."""
    c = db.query(Clinic).first()
    cfg = deepgram_integration.get_clinic_deepgram_config(db, c.id if c else 1)

    content_type = req.headers.get("content-type", "")
    raw = await req.body()

    if content_type.startswith("application/json"):
        import json
        try:
            body = json.loads(raw.decode("utf-8"))
            if "audio_base64" in body:
                audio_bytes = base64.b64decode(body["audio_base64"])
            else:
                audio_bytes = b""
            language = body.get("language") or language
            audio_content_type = body.get("content_type", "audio/webm")
        except Exception as e:
            raise HTTPException(400, f"Malformed JSON: {e}")
    else:
        audio_bytes = raw
        audio_content_type = content_type or "audio/webm"

    result = deepgram_integration.transcribe_audio_buffer(
        audio_bytes=audio_bytes,
        content_type=audio_content_type,
        language=language,
        model=cfg.get("model", "nova-2"),
        api_key=cfg.get("api_key"),
    )
    result["configured"] = cfg.get("configured", False)
    result["language"] = language
    return result


@r.get("/voice/status")
def voice_status(
    clinic_id: int = 1,
    db: Session = Depends(get_db)
):
    """Returns configuration and telemetry status for Twilio, LiveKit, and Deepgram."""
    c = db.get(Clinic, clinic_id) or db.query(Clinic).first()
    cid = c.id if c else 1

    lk_cfg = livekit_integration.get_clinic_livekit_config(db, cid)
    dg_cfg = deepgram_integration.get_clinic_deepgram_config(db, cid)

    return {
        "twilio": {
            "configured": bool(twilio_integration.TWILIO_AUTH_TOKEN and twilio_integration.TWILIO_AUTH_TOKEN != "dev-twilio-auth-token"),
            "monthly_minutes": twilio_integration.get_monthly_minutes(cid),
            "monthly_cap": twilio_integration.VOICE_MONTHLY_MINUTE_CAP,
        },
        "livekit": {
            "configured": lk_cfg.get("configured", False),
            "url": lk_cfg.get("url"),
            "agent_protocol": "webrtc_audio",
        },
        "deepgram": {
            "configured": dg_cfg.get("configured", False),
            "model": dg_cfg.get("model", "nova-2"),
            "language": dg_cfg.get("language", "hi"),
        },
    }


