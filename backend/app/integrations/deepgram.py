"""Deepgram Speech-to-Text (STT) integration for Parchi AI Voice Agent.
Supports:
  1. Deepgram Nova-2 / Nova-3 REST acoustic transcription for recorded voice turns.
  2. Multilingual model support for Hindi (hi), Indian English (en-IN), Hinglish, and Marathi.
  3. Real-time streaming WebSocket parameter negotiation.
  4. Clinic BYOK (Bring Your Own Key) retrieval from ClinicRule.
"""
import logging
import os
import time
import httpx
from sqlalchemy.orm import Session
from ..config import DEEPGRAM_API_KEY
from ..models import ClinicRule

logger = logging.getLogger("parchi.deepgram")

DEEPGRAM_API_URL = "https://api.deepgram.com/v1/listen"


def get_clinic_deepgram_config(db: Session | None, clinic_id: int) -> dict:
    """Retrieves clinic-specific Deepgram settings from ClinicRule, falling back to env."""
    api_key = DEEPGRAM_API_KEY
    model = "nova-2"
    language = "hi"

    if db is not None:
        rules = db.query(ClinicRule).filter_by(clinic_id=clinic_id, active=True).all()
        rule_map = {r.rule_key: r.rule_value for r in rules}
        if rule_map.get("deepgram_api_key"):
            api_key = rule_map["deepgram_api_key"].strip()
        if rule_map.get("deepgram_model"):
            model = rule_map["deepgram_model"].strip()
        if rule_map.get("deepgram_language"):
            language = rule_map["deepgram_language"].strip()

    return {
        "api_key": api_key,
        "model": model,
        "language": language,
        "configured": bool(api_key and api_key.strip()),
    }


def transcribe_audio_buffer(
    audio_bytes: bytes,
    content_type: str = "audio/webm",
    language: str = "hi",
    model: str = "nova-2",
    api_key: str | None = None,
) -> dict:
    """Transcribes an audio byte buffer using Deepgram Nova-2 STT.
    Falls back gracefully with diagnostic output if API key is not configured.
    """
    key = api_key or DEEPGRAM_API_KEY
    t0 = time.perf_counter()

    if not key or not key.strip():
        # Fallback diagnostic response when API key is not supplied
        latency_ms = round((time.perf_counter() - t0) * 1000, 1)
        return {
            "transcript": "",
            "confidence": 0.0,
            "words": [],
            "model": model,
            "latency_ms": latency_ms,
            "error": "DEEPGRAM_API_KEY not configured. Add your key in Dashboard Settings or .env.",
            "status": "unconfigured",
        }

    # Map language codes for Deepgram Nova-2
    lang_code = "hi" if "hi" in language.lower() else ("mr" if "mr" in language.lower() else "en-IN")

    params = {
        "model": model,
        "language": lang_code,
        "smart_format": "true",
        "punctuate": "true",
    }

    headers = {
        "Authorization": f"Token {key.strip()}",
        "Content-Type": content_type or "audio/webm",
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.post(
                DEEPGRAM_API_URL,
                params=params,
                headers=headers,
                content=audio_bytes,
            )

        latency_ms = round((time.perf_counter() - t0) * 1000, 1)

        if res.status_code != 200:
            logger.warning("Deepgram API returned %d: %s", res.status_code, res.text)
            return {
                "transcript": "",
                "confidence": 0.0,
                "words": [],
                "model": model,
                "latency_ms": latency_ms,
                "error": f"Deepgram API error {res.status_code}",
                "status": "error",
            }

        data = res.json()
        channels = data.get("results", {}).get("channels", [])
        if not channels:
            return {
                "transcript": "",
                "confidence": 0.0,
                "words": [],
                "model": model,
                "latency_ms": latency_ms,
                "status": "empty",
            }

        first_alt = channels[0].get("alternatives", [{}])[0]
        transcript = first_alt.get("transcript", "").strip()
        confidence = float(first_alt.get("confidence", 0.0))
        words = first_alt.get("words", [])

        return {
            "transcript": transcript,
            "confidence": confidence,
            "words": words,
            "model": model,
            "language": lang_code,
            "latency_ms": latency_ms,
            "status": "ok",
        }

    except Exception as e:
        latency_ms = round((time.perf_counter() - t0) * 1000, 1)
        logger.error("Deepgram transcription exception: %s", e)
        return {
            "transcript": "",
            "confidence": 0.0,
            "words": [],
            "model": model,
            "latency_ms": latency_ms,
            "error": str(e),
            "status": "exception",
        }
