"""LLM intent classifier + built-in multilingual semantic fallback for administrative receptionist.
The LLM NEVER generates replies or medical answers; it only classifies intent.
All replies are generated strictly from clinic database facts and static templates."""
import os
import re
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

# Built-in multilingual semantic phrases (used seamlessly when LLM_API_KEY is unset or fails/times out)
_SEMANTIC_RULES: list[tuple[str, re.Pattern[str], float]] = [
    (
        "wait",
        re.compile(
            r"\b(how long|waiting|queue|line|rush|bheed|baith|baitha|baithe|chamber|cabin|"
            r"pahunche|pahunch|aayenge|aaye|kab tak|deri|late|status)\b|"
            r"प्रतीक्षा|रांग|पोहोचले|कधी येणार|किती वेळ लागेल",
            re.I,
        ),
        0.86,
    ),
    (
        "fees",
        re.compile(
            r"\b(how much|cost|payment|pay|rupees?|rs\.?|money|charge[sd]?|pricing|"
            r"consultation|checkup fee|visit fee|paisa|paise|kharcha|dar|upi|cash)\b|"
            r"पैसे|खर्च|चार्ज|कन्सल्टेशन",
            re.I,
        ),
        0.88,
    ),
    (
        "address",
        re.compile(
            r"\b(where|located|direction[s]?|landmark|route|map|reach|near|nearby|"
            r"kidhar|kahan|kaise aana|kaise aaye|jagah)\b|"
            r"कुठे आहे|कसे यायचे|दिशा|पत्ता सांगा",
            re.I,
        ),
        0.88,
    ),
    (
        "hours",
        re.compile(
            r"\b(open|close|closing|shut|khula|khuli|band|opd|schedule|sunday|monday|"
            r"tuesday|wednesday|thursday|friday|saturday|ravivar|somvar|shaniwar|"
            r"morning|evening|subah|shaam|time|timing)\b|"
            r"केव्हा उघडते|कधी बंद|ओपीडी|वेळापत्रक",
            re.I,
        ),
        0.85,
    ),
    (
        "booking",
        re.compile(
            r"\b(book|appt|appointment|reserve|schedule|fix|dikhana|checkup|check up|"
            r"consult|milna|visit karna|number lagana|parchi)\b|"
            r"नोंदणी|अपॉइंटमेंट घ्या|तपासणी|नंबर लावा",
            re.I,
        ),
        0.84,
    ),
    (
        "availability",
        re.compile(
            r"\b(free|available|slot|kal|aaj|tomorrow|today|next week|meet|sitting)\b|"
            r"आज उपलब्ध|उद्या|भेटू शकतात",
            re.I,
        ),
        0.82,
    ),
]


def local_semantic_classify(text: str, lang: str = "en") -> dict:
    """Zero-latency multilingual fallback intent classifier across en, hi, hinglish, and mr."""
    clean = (text or "").strip()
    if not clean:
        return {"intent": "other", "confidence": 0.0, "source": "local_semantic"}

    for intent, pattern, conf in _SEMANTIC_RULES:
        if pattern.search(clean):
            return {"intent": intent, "confidence": conf, "source": "local_semantic"}

    return {"intent": "other", "confidence": 0.0, "source": "local_semantic"}


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


def get_llm_status(clinic_id: int) -> dict:
    """Returns current LLM classifier mode, model, and today's cap usage for the clinic."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    used = _clinic_daily_calls.get((clinic_id, today), 0)
    has_key = bool(LLM_API_KEY and LLM_API_KEY.strip())
    return {
        "mode": "external_llm" if has_key else "built_in_semantic",
        "model": LLM_MODEL if has_key else "parchi-multilingual-semantic",
        "daily_cap": LLM_DAILY_CAP,
        "used_today": used,
        "remaining_today": max(0, LLM_DAILY_CAP - used),
        "languages": ["en", "hinglish", "hi", "mr"],
        "safety_gate": "pre_model_active",
    }


def classify(text: str, lang: str = "en", channel: str = "web") -> dict:
    """Classifies user intent using external OpenAI-compatible LLM (1.5s timeout)
    and seamlessly falls back to the built-in multilingual semantic classifier when
    LLM_API_KEY is absent or an API error/timeout occurs.
    Supports English, Hindi, Hinglish, and Marathi.
    Returns: {"intent": one of [hours, address, fees, wait, availability, booking, other], "confidence": float}
    """
    if not LLM_API_KEY:
        return local_semantic_classify(text, lang)

    base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    url = f"{base_url}/chat/completions"

    system_prompt = (
        "You are an administrative intent classifier for a medical clinic front desk. "
        "Supported languages: English, Hindi, Hinglish, and Marathi (Devanagari and Romanized Marathi). "
        "You must NEVER provide medical advice, diagnosis, or write user-facing answers. "
        "Voice prompt rule: for voice calls, keep replies strictly under 2 sentences and never ask the caller to press a button or key. "
        "Classify the user utterance into exactly ONE label from: [hours, address, fees, wait, availability, booking, other]. "
        "Output ONLY a raw JSON object with keys 'intent' (string) and 'confidence' (float between 0.0 and 1.0)."
    )

    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Language: {lang}\nChannel: {channel}\nMessage: {text}"},
        ],
        "temperature": 0.0,
        "max_tokens": 50,
        "response_format": {"type": "json_object"},
    }

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=1.5) as client:
            resp = client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                return local_semantic_classify(text, lang)
            data = resp.json()
            raw_content = data["choices"][0]["message"]["content"]
            parsed = json.loads(raw_content)

            intent = str(parsed.get("intent", "other")).strip().lower()
            if intent not in ALLOWED_INTENTS:
                intent = "other"

            confidence = float(parsed.get("confidence", 0.0))
            confidence = max(0.0, min(1.0, confidence))
            if intent == "other" or confidence < 0.7:
                sem = local_semantic_classify(text, lang)
                if sem["confidence"] >= 0.7:
                    return sem
            return {"intent": intent, "confidence": confidence, "source": "external_llm"}
    except Exception as exc:
        logger.warning("LLM classification failed or timed out, using semantic fallback: %s", exc)
        return local_semantic_classify(text, lang)
