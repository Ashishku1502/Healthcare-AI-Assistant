"""LLM intent classifier fallback for administrative receptionist.
The LLM NEVER generates replies or medical answers; it only classifies intent.
All replies are generated strictly from clinic database facts and static templates."""
import os
import json
import logging
from datetime import datetime, timezone
from collections import defaultdict
import httpx
from .config import LLM_API_KEY, LLM_MODEL, LLM_DAILY_CAP

logger = logging.getLogger(__name__)

ALLOWED_INTENTS = {"hours", "address", "fees", "wait", "availability", "booking", "other"}

# Per-clinic daily call tracker: (clinic_id, YYYY-MM-DD) -> call_count
_clinic_daily_calls: dict[tuple[int, str], int] = defaultdict(int)

def check_and_increment_cap(clinic_id: int) -> bool:
    """Returns True if clinic is within LLM daily cap, False if cap is reached."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    current = _clinic_daily_calls[(clinic_id, today)]
    if current >= LLM_DAILY_CAP:
        return False
    _clinic_daily_calls[(clinic_id, today)] += 1
    return True

def reset_daily_cap():
    """Testing helper to reset per-clinic daily counters."""
    _clinic_daily_calls.clear()

def classify(text: str, lang: str = "en") -> dict:
    """Classifies user intent using LLM with 1.5s timeout.
    Returns: {"intent": one of [hours, address, fees, wait, availability, booking, other], "confidence": float}
    On timeout, error, missing key, or invalid response, returns {"intent": "other", "confidence": 0.0}.
    """
    if not LLM_API_KEY:
        return {"intent": "other", "confidence": 0.0}

    base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    url = f"{base_url}/chat/completions"

    system_prompt = (
        "You are an administrative intent classifier for a medical clinic front desk. "
        "You must NEVER provide medical advice, diagnosis, or write user-facing answers. "
        "Classify the user utterance into exactly ONE label from: [hours, address, fees, wait, availability, booking, other]. "
        "Output ONLY a raw JSON object with keys 'intent' (string) and 'confidence' (float between 0.0 and 1.0)."
    )

    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Language: {lang}\nMessage: {text}"}
        ],
        "temperature": 0.0,
        "max_tokens": 50,
        "response_format": {"type": "json_object"}
    }

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        with httpx.Client(timeout=1.5) as client:
            resp = client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                return {"intent": "other", "confidence": 0.0}
            data = resp.json()
            raw_content = data["choices"][0]["message"]["content"]
            parsed = json.loads(raw_content)

            intent = str(parsed.get("intent", "other")).strip().lower()
            if intent not in ALLOWED_INTENTS:
                intent = "other"

            confidence = float(parsed.get("confidence", 0.0))
            confidence = max(0.0, min(1.0, confidence))
            return {"intent": intent, "confidence": confidence}
    except Exception as exc:
        logger.warning("LLM classification failed or timed out: %s", exc)
        return {"intent": "other", "confidence": 0.0}
