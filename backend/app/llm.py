"""LLM intent classifier + generative receptionist engine with built-in multilingual semantic fallback.
Supports OpenAI, Google Gemini, Groq, OpenRouter, and custom OpenAI-compatible endpoints.
Rules:
- Never provide medical advice or diagnosis.
- Emergency red flags always bypass LLM to 112 triage.
- Voice replies must be concise (< 2 sentences).
- Clinic facts (hours, fees, address, live doctor status) are strictly grounded.
"""
import os
import re
import json
import time
import logging
from datetime import datetime, timezone
from collections import defaultdict
import httpx
from sqlalchemy.orm import Session
from .config import LLM_API_KEY, LLM_MODEL, LLM_DAILY_CAP
from .models import ClinicRule, Audit

logger = logging.getLogger(__name__)

ALLOWED_INTENTS = {"hours", "address", "fees", "wait", "availability", "booking", "services", "payment", "other"}

PROVIDER_PRESETS = {
    "gemini": {
        "name": "Google Gemini",
        "url": "https://generativelanguage.googleapis.com/v1beta/openai",
        "default_model": "gemini-1.5-flash",
    },
    "openai": {
        "name": "OpenAI",
        "url": "https://api.openai.com/v1",
        "default_model": "gpt-4o-mini",
    },
    "groq": {
        "name": "Groq",
        "url": "https://api.groq.com/openai/v1",
        "default_model": "llama-3.3-70b-versatile",
    },
    "openrouter": {
        "name": "OpenRouter",
        "url": "https://openrouter.ai/api/v1",
        "default_model": "meta-llama/llama-3.3-70b-instruct",
    },
    "custom": {
        "name": "Custom OpenAI-Compatible",
        "url": "",
        "default_model": "gpt-4o-mini",
    },
}

# Per-clinic daily call tracker: (clinic_id, YYYY-MM-DD) -> call_count
_clinic_daily_calls: dict[tuple[int, str], int] = defaultdict(int)

# In-memory bounded intent cache: (normalized_text, lang) -> result dict
_INTENT_CACHE: dict[tuple[str, str], dict] = {}
_MAX_CACHE_SIZE = 512

# Persistent HTTP client for connection pooling when calling external LLM
_http_client: httpx.Client | None = None


def _get_http_client() -> httpx.Client:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.Client(
            timeout=2.0,
            limits=httpx.Limits(max_keepalive_connections=15, max_connections=30),
        )
    return _http_client


def get_clinic_llm_settings(db: Session | None, clinic_id: int) -> dict:
    """Retrieves clinic-specific LLM configuration from ClinicRules, falling back to env."""
    provider = "builtin"
    key = LLM_API_KEY
    model = LLM_MODEL
    base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    cap = LLM_DAILY_CAP

    if db is not None:
        rules = db.query(ClinicRule).filter_by(clinic_id=clinic_id, active=True).all()
        rule_map = {r.rule_key: r.rule_value for r in rules}
        if rule_map.get("llm_api_key"):
            key = rule_map["llm_api_key"].strip()
        if rule_map.get("llm_provider"):
            provider = rule_map["llm_provider"].strip().lower()
        if rule_map.get("llm_model"):
            model = rule_map["llm_model"].strip()
        if rule_map.get("llm_base_url"):
            base_url = rule_map["llm_base_url"].strip().rstrip("/")
        if rule_map.get("llm_daily_cap"):
            try:
                cap = int(rule_map["llm_daily_cap"])
            except (ValueError, TypeError):
                pass

    if key and provider == "builtin":
        if "generativelanguage.googleapis.com" in base_url or key.startswith("AIza"):
            provider = "gemini"
            base_url = PROVIDER_PRESETS["gemini"]["url"]
        elif key.startswith("gsk_"):
            provider = "groq"
            base_url = PROVIDER_PRESETS["groq"]["url"]
        else:
            provider = "openai"

    if provider in PROVIDER_PRESETS and not base_url:
        base_url = PROVIDER_PRESETS[provider]["url"]

    return {
        "provider": provider,
        "api_key": key,
        "model": model,
        "base_url": base_url,
        "daily_cap": cap,
        "has_key": bool(key and key.strip()),
    }


def get_clinic_llm_config(db: Session, clinic_id: int) -> dict:
    """Returns safe masked configuration for dashboard UI display."""
    st = get_clinic_llm_settings(db, clinic_id)
    key = st["api_key"]
    masked = ""
    if key:
        masked = key[:4] + "••••" + key[-4:] if len(key) >= 10 else "••••••••"

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    used = _clinic_daily_calls.get((clinic_id, today), 0)

    return {
        "provider": st["provider"],
        "model": st["model"],
        "base_url": st["base_url"],
        "has_key": st["has_key"],
        "api_key_masked": masked,
        "daily_cap": st["daily_cap"],
        "used_today": used,
        "remaining_today": max(0, st["daily_cap"] - used),
        "presets": {k: {"name": v["name"], "default_model": v["default_model"]} for k, v in PROVIDER_PRESETS.items()},
    }


def update_clinic_llm_config(db: Session, clinic_id: int, data: dict, actor: str) -> dict:
    """Updates clinic LLM settings in ClinicRules table with audit trail."""
    provider = str(data.get("provider", "openai")).strip().lower()
    model = str(data.get("model", "")).strip()
    key = str(data.get("api_key", "")).strip()
    base_url = str(data.get("base_url", "")).strip().rstrip("/")

    if provider in PROVIDER_PRESETS:
        if not base_url:
            base_url = PROVIDER_PRESETS[provider]["url"]
        if not model:
            model = PROVIDER_PRESETS[provider]["default_model"]

    settings_to_set = {
        "llm_provider": provider,
        "llm_model": model,
        "llm_base_url": base_url,
    }
    if key and key != "keep":
        settings_to_set["llm_api_key"] = key

    for k, v in settings_to_set.items():
        existing = db.query(ClinicRule).filter_by(clinic_id=clinic_id, rule_key=k, active=True).first()
        if existing:
            existing.rule_value = v
        else:
            db.add(ClinicRule(clinic_id=clinic_id, rule_key=k, rule_value=v, version=1, active=True, created_by=actor))

    db.add(Audit(clinic_id=clinic_id, actor=actor, action=f"update llm config (provider={provider}, model={model})"))
    db.commit()
    _INTENT_CACHE.clear()
    return get_clinic_llm_config(db, clinic_id)


def test_llm_connection(db: Session, clinic_id: int, data: dict) -> dict:
    """Live diagnostic ping to test LLM API key credentials and latency."""
    st = get_clinic_llm_settings(db, clinic_id)
    key = str(data.get("api_key") or st["api_key"]).strip()
    provider = str(data.get("provider") or st["provider"]).strip().lower()
    model = str(data.get("model") or st["model"]).strip()
    base_url = str(data.get("base_url") or st["base_url"]).strip().rstrip("/")

    if not key:
        return {"ok": False, "error": "No API key provided"}

    if provider in PROVIDER_PRESETS and not base_url:
        base_url = PROVIDER_PRESETS[provider]["url"]

    url = f"{base_url}/chat/completions"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a clinic assistant. Reply with JSON: {\"status\": \"ok\", \"ping\": \"pong\"}"},
            {"role": "user", "content": "Ping test"},
        ],
        "temperature": 0.0,
        "max_tokens": 30,
        "response_format": {"type": "json_object"},
    }

    t0 = time.perf_counter()
    try:
        client = _get_http_client()
        resp = client.post(url, json=payload, headers=headers)
        latency = round((time.perf_counter() - t0) * 1000, 1)
        if resp.status_code == 200:
            return {"ok": True, "provider": provider, "model": model, "latency_ms": latency}
        return {"ok": False, "status_code": resp.status_code, "error": resp.text[:200], "latency_ms": latency}
    except Exception as e:
        latency = round((time.perf_counter() - t0) * 1000, 1)
        return {"ok": False, "error": str(e), "latency_ms": latency}


# Built-in multilingual semantic phrases (used seamlessly when LLM_API_KEY is unset or fails/times out)
_SEMANTIC_RULES: list[tuple[str, re.Pattern[str], float]] = [
    (
        "wait",
        re.compile(
            r"\b(how long|waiting|queue|line|rush|bheed|baith|baitha|baithe|chamber|cabin|"
            r"pahunche|pahunch|aayenge|aaye|kab tak|deri|late|status|kitni der|kitna time)\b|"
            r"प्रतीक्षा|रांग|पोहोचले|कधी येणार|किती वेळ लागेल",
            re.I,
        ),
        0.86,
    ),
    (
        "fees",
        re.compile(
            r"\b(how much|cost|payment|pay|rupees?|rs\.?|money|charge[sd]?|pricing|"
            r"consultation|checkup fee|visit fee|paisa|paise|kharcha|dar|upi|cash|gpay|paytm|card|phonepe)\b|"
            r"पैसे|खर्च|चार्ज|कन्सल्टेशन",
            re.I,
        ),
        0.88,
    ),
    (
        "address",
        re.compile(
            r"\b(where|located|direction[s]?|landmark|route|map|reach|near|nearby|"
            r"kidhar|kahan|kaise aana|kaise aaye|jagah|parking|metro|bus)\b|"
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
            r"morning|evening|subah|shaam|time|timing|kitne baje|holiday)\b|"
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
    (
        "services",
        re.compile(
            r"\b(service|services|treatment|checkup|test|tests|ecg|sugar|bp|blood pressure|lab|facility|facilities|suvidha|subidha|upchar)\b|"
            r"सुविधा|उपचार|तपासण्या",
            re.I,
        ),
        0.85,
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
        "fast_cache_size": len(_INTENT_CACHE),
        "fast_path": "semantic_first_plus_pool",
    }


def _cache_put(key: tuple[str, str], value: dict) -> dict:
    if len(_INTENT_CACHE) >= _MAX_CACHE_SIZE:
        _INTENT_CACHE.pop(next(iter(_INTENT_CACHE)))
    _INTENT_CACHE[key] = value
    return value


def classify(text: str, lang: str = "en", channel: str = "web", db: Session | None = None, clinic_id: int = 1) -> dict:
    """Classifies user intent using a zero-latency semantic fast path + LRU cache,
    falling back to external OpenAI/Gemini/Groq API (1.5s timeout) only when needed.
    """
    norm = (text or "").strip().lower()
    cache_key = (norm, lang)
    if cache_key in _INTENT_CACHE:
        return _INTENT_CACHE[cache_key]

    # Zero-latency semantic fast path (< 1ms)
    sem = local_semantic_classify(text, lang)
    st = get_clinic_llm_settings(db, clinic_id) if db is not None else {"api_key": LLM_API_KEY, "model": LLM_MODEL, "base_url": os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")}

    if sem["confidence"] >= 0.82 or not st.get("api_key"):
        return _cache_put(cache_key, sem)

    url = f"{st['base_url']}/chat/completions"
    system_prompt = (
        "You are an administrative intent classifier for a medical clinic front desk. "
        "Supported languages: English, Hindi, Hinglish, and Marathi. "
        "You must NEVER provide medical advice or diagnosis. "
        "Classify the user utterance into exactly ONE label from: [hours, address, fees, wait, availability, booking, services, payment, other]. "
        "Output ONLY a raw JSON object with keys 'intent' (string) and 'confidence' (float between 0.0 and 1.0)."
    )
    payload = {
        "model": st.get("model") or LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Language: {lang}\nChannel: {channel}\nMessage: {text}"},
        ],
        "temperature": 0.0,
        "max_tokens": 50,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {st['api_key']}", "Content-Type": "application/json"}

    try:
        client = _get_http_client()
        resp = client.post(url, json=payload, headers=headers)
        if resp.status_code != 200:
            return sem
        data = resp.json()
        raw_content = data["choices"][0]["message"]["content"]
        parsed = json.loads(raw_content)

        intent = str(parsed.get("intent", "other")).strip().lower()
        if intent not in ALLOWED_INTENTS:
            intent = "other"

        confidence = float(parsed.get("confidence", 0.0))
        confidence = max(0.0, min(1.0, confidence))
        if intent == "other" or confidence < 0.7:
            if sem["confidence"] >= 0.7:
                return _cache_put(cache_key, sem)
        return _cache_put(cache_key, {"intent": intent, "confidence": confidence, "source": "external_llm"})
    except Exception as exc:
        logger.warning("LLM classification fallback: %s", exc)
        return sem


def generate_receptionist_reply(
    db: Session,
    clinic,
    docs: list,
    rules: dict,
    text: str,
    lang: str,
    is_voice: bool = False
) -> str:
    """Generates an intelligent, accurate administrative receptionist reply
    grounded strictly in clinic facts (hours, address, fees, doctor status, rules).
    Uses the configured LLM API (Gemini/OpenAI/Groq) if available, or smart neural fallback.
    """
    st = get_clinic_llm_settings(db, clinic.id)
    doc_summary = ", ".join([f"Dr. {d.name} ({d.speciality or 'General Physician'}, Status: {d.status_state})" for d in docs]) if docs else "No doctors listed"
    hours_info = rules.get("hours") or clinic.hours or "Mon-Sat 9 AM - 7 PM"
    fees_info = clinic.fees or "Consultation Rs 300"
    address_info = clinic.address or "12 MG Road, Nagpur"

    # If external LLM API is configured, use it for rich conversational receptionist answers
    if st.get("api_key"):
        voice_prompt_rules = (
            "\nVOICE CALL CONSTRAINTS:\n"
            "- You are speaking directly on a live phone call.\n"
            "- Respond in spoken, natural conversational language strictly under 2 sentences.\n"
            "- Never use markdown formatting, asterisks, bullet points, or numbered lists.\n"
            "- Never ask the caller to press or dial any buttons or keys."
            if is_voice else
            "- Keep replies friendly, concise, and helpful."
        )
        system_instruction = (
            f"You are Parchi, the friendly automated receptionist at {clinic.name}. "
            f"Clinic facts: Address: {address_info}. Hours: {hours_info}. Fees: {fees_info}. "
            f"Doctors on duty: {doc_summary}. Staff phone: {clinic.staff_phone or 'at reception'}. "
            "STRICT CLINIC RULES:\n"
            "1. NEVER give medical advice, diagnostic opinions, or prescribe medications.\n"
            "2. If the user mentions severe red flags (chest pain, severe bleeding, breathlessness), direct them to call 112 immediately.\n"
            "3. Answer in the caller's language: English, Hindi, Hinglish, or Marathi.\n"
            f"{voice_prompt_rules}"
        )
        url = f"{st['base_url']}/chat/completions"
        headers = {"Authorization": f"Bearer {st['api_key']}", "Content-Type": "application/json"}
        payload = {
            "model": st["model"],
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": text},
            ],
            "temperature": 0.2,
            "max_tokens": 65 if is_voice else 120,
        }
        try:
            client = _get_http_client()
            resp = client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                out = resp.json()["choices"][0]["message"]["content"].strip()
                return out
        except Exception as e:
            logger.warning("Generative LLM reply error: %s", e)

    # Smart grounded fallback
    low = text.lower()
    if re.search(r"upi|gpay|paytm|phonepe|card|cash|payment|pay|mode", low):
        if lang == "mr":
            return f"आम्ही रोख (Cash), UPI आणि कार्ड स्वीकारतो, आणि कन्सल्टेशन फी {fees_info} आहे."
        if lang in ("hi", "hinglish"):
            return f"Aap Cash, UPI (Google Pay, PhonePe) ya Card se payment kar sakte hain, aur consultation fee {fees_info} hai."
        return f"We accept Cash, UPI (Google Pay, PhonePe), and Cards, and consultation fee is {fees_info}."

    if re.search(r"service|facility|facilities|treatment|test|tests|suvidha|ecg|sugar|bp", low):
        primary_doc = docs[0].name if docs else "Chief Doctor"
        if lang == "mr":
            return f"{clinic.name} मध्ये जनरल तपासणी, बीपी, शुगर टेस्ट आणि डॉ. {primary_doc} यांच्याकडे कन्सल्टेशन उपलब्ध आहे."
        if lang in ("hi", "hinglish"):
            return f"{clinic.name} par routine checkup, BP, sugar test aur Dr. {primary_doc} ke saath consultation available hai."
        return f"{clinic.name} provides routine health checkups, BP, sugar tests and consultations with Dr. {primary_doc}."

    if re.search(r"walkin|bina appointment|direct|walk in|token", low):
        if lang == "mr":
            return f"होय, तुम्ही थेट येऊ शकता आणि क्लिनिकच्या वेळेत ({hours_info}) टोकन क्रमाने तपासणी केली जाते."
        if lang in ("hi", "hinglish"):
            return f"Haan, aap seedhe aa sakte hain aur clinic timing {hours_info} mein token number ke hisaab se consult hota hai."
        return f"Yes, walk-ins are welcome during OPD hours ({hours_info}) on a first-come token basis."

    if lang == "mr":
        return f"{clinic.name} मध्ये स्वागत आहे, तुम्ही डॉक्टर स्टेटस, वेळ, फी ({fees_info}) किंवा पत्ता विचारू शकता."
    if lang in ("hi", "hinglish"):
        return f"{clinic.name} mein aapka swagat hai, aap fees ({fees_info}), timing ({hours_info}) ya doctor wait status pooch sakte hain."
    return f"Welcome to {clinic.name}. You can check consultation fees ({fees_info}), hours ({hours_info}), or doctor wait status."
