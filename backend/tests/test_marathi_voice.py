"""
5 test cases for Marathi language detection & reply prompts, plus the voice prompt rule
(for voice: keep replies under 2 sentences and never ask the caller to press a button).

Includes boundary and honest 'it failing' cases.
"""

import os
os.environ.setdefault("LOGIN_RATE_PER_MIN", "10000")

import hashlib
import hmac
import json
import re
import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models import Clinic, User, Doctor, Patient
from app.receptionist import lang, _protect_dots
from app.security import hash_pw

cl = TestClient(app)

MV_OWNER = "marathi_voice_owner@clinic.com"
MV_PASS = "clinic1234"
_clinic_id: int | None = None
_headers: dict | None = None


def setup_module():
    global _clinic_id
    db = SessionLocal()
    try:
        c = db.query(Clinic).filter_by(name="Marathi Voice Clinic").first()
        if not c:
            c = Clinic(
                name="Marathi Voice Clinic",
                address="45 FC Road, Pune",
                hours="Mon-Sat 9 AM - 6 PM",
                fees="Rs 350",
                staff_phone="9823011111",
            )
            db.add(c)
            db.flush()
            db.add(User(clinic_id=c.id, email=MV_OWNER, password_hash=hash_pw(MV_PASS), role="owner"))
            db.add(Doctor(clinic_id=c.id, name="Deshmukh", speciality="General Physician", days="0,1,2,3,4,5,6", active=True))
            db.commit()
        _clinic_id = c.id
    finally:
        db.close()


def _auth() -> dict:
    global _headers
    if _headers is None:
        r = cl.post("/auth/login", json={"email": MV_OWNER, "password": MV_PASS})
        assert r.status_code == 200, f"login failed: {r.text}"
        _headers = {"Authorization": "Bearer " + r.json()["token"]}
    return _headers


def _sentence_count(text: str) -> int:
    protected = _protect_dots(text.strip())
    parts = [p.strip() for p in re.split(r"(?<=[.!?।])\s+", protected) if p.strip()]
    return len(parts)


def _voice_call(speech: str, call_id: str | None = None, confidence: float = 0.95) -> dict:
    payload = {
        "call_id": call_id or f"vc-{uuid.uuid4().hex[:8]}",
        "from": "9823022222",
        "speech": speech,
        "confidence": confidence,
    }
    raw = json.dumps(payload).encode()
    sig = hmac.new(b"dev-voice-secret", raw, hashlib.sha256).hexdigest()
    r = cl.post(f"/webhooks/voice/{_clinic_id}", content=raw, headers={"X-Signature": sig, "Content-Type": "application/json"})
    assert r.status_code == 200, f"voice failed: {r.text}"
    return r.json()


# ── Test 1 (PASS): Marathi language detection (Devanagari & Romanized) ──

def test_1_marathi_language_detection_devanagari_and_romanized():
    marathi_inputs = [
        "आज क्लिनिकची वेळ काय आहे?",
        "डॉक्टर आलेत का?",
        "tumchi fee kiti aahe",
        "udya slot book karayche aahet",
        "माझ्या रिपोर्ट बद्दल सांगता का",
    ]
    for msg in marathi_inputs:
        assert lang(msg) == "mr", f"expected 'mr' for '{msg}', got '{lang(msg)}'"

    # Hindi and Hinglish must not be misclassified as Marathi
    assert lang("डॉक्टर कब बैठते हैं और समय क्या है") == "hi"
    assert lang("kya fees hai clinic ki") == "hinglish"
    assert lang("What are your hours today?") == "en"


# ── Test 2 (PASS): Marathi reply prompts across intents (report, nomsg, availability, hours) ──

def test_2_marathi_reply_prompts_across_intents():
    h = _auth()

    r_hours = cl.post("/chat", json={"session_id": f"mr-h-{uuid.uuid4().hex[:6]}", "message": "क्लिनिकची वेळ काय आहे?"}, headers=h).json()["reply"]
    assert "ची वेळ:" in r_hours and "मी पारची" in r_hours

    r_rep = cl.post("/chat", json={"session_id": f"mr-r-{uuid.uuid4().hex[:6]}", "message": "माझ्या रिपोर्ट बद्दल सांगा"}, headers=h).json()["reply"]
    assert "रिपोर्टची माहिती देऊ शकत नाही" in r_rep

    r_avail = cl.post("/chat", json={"session_id": f"mr-a-{uuid.uuid4().hex[:6]}", "message": "उद्या कोणते स्लॉट उपलब्ध आहेत?"}, headers=h).json()["reply"]
    assert "डॉ. Deshmukh" in r_avail

    r_nomsg = cl.post(
        "/chat",
        json={
            "session_id": f"mr-n-{uuid.uuid4().hex[:6]}",
            "message": "या नंबरवर मेसेज पाठवू नका",
            "patient_name": "Suresh Patil",
            "patient_phone": "9823033333",
        },
        headers=h,
    ).json()["reply"]
    assert "मेसेज पाठवणार नाही" in r_nomsg

    db = SessionLocal()
    try:
        p = db.query(Patient).filter_by(clinic_id=_clinic_id, phone="9823033333").first()
        assert p is not None and p.no_message is True
    finally:
        db.close()


# ── Test 3 (PASS): Voice rule -> under 2 sentences and never ask caller to press a button ──

def test_3_voice_replies_under_2_sentences_and_no_button_prompts():
    voice_queries = [
        "What are your clinic hours?",
        "I have severe chest pain right now",
        "What tablet should I take for headache?",
        "When is the doctor available tomorrow?",
        "क्लिनिकची वेळ काय आहे?",
    ]
    for q in voice_queries:
        res = _voice_call(q)
        say_text = res["say"]
        assert _sentence_count(say_text) < 2, f"voice reply exceeded <2 sentences ({_sentence_count(say_text)}): {say_text}"
        assert not re.search(r"\bpress\b|\bbutton\b|बटन दबा|बटण दाब", say_text, re.I), (
            f"voice reply asked caller to press button: {say_text}"
        )


# ── Test 4 (FAIL / ADVERSARIAL): Rule / prompt with multi-sentence 'Press 1' blocked on voice ──

def test_4_voice_sanitizes_multi_sentence_and_button_prompt_from_clinic_rule():
    h = _auth()
    # Owner saves a multi-sentence rule that tries to ask callers to press a button
    rule_res = cl.post(
        "/rules",
        json={
            "rule_key": "queue_priority",
            "rule_value": "Elderly patients go first. Please press 1 on your phone for desk. Bring ID card.",
        },
        headers=h,
    )
    assert rule_res.status_code == 201

    # On voice channel, 'press 1' must be stripped and reply kept strictly under 2 sentences
    res = _voice_call("Do you have elderly priority today?")
    say_text = res["say"]
    assert _sentence_count(say_text) < 2, f"expected <2 sentences, got {_sentence_count(say_text)}: {say_text}"
    assert "press 1" not in say_text.lower()
    assert "automated assistant" in say_text.lower()


# ── Test 5 (FAILURE CASE — 'It Failing'): Ambiguous loanword detection miss + unclear voice turns ──

@patch("app.llm.classify", return_value={"intent": "fees", "confidence": 0.95})
def test_5_ambiguous_marathi_loanword_misses_mr_and_unclear_voice_stays_under_2_sentences(mock_classify):
    """
    Honest 'it failing' case:
    1) Single-word / ambiguous English-Marathi loanwords like 'fees?' or pure Hindi without Marathi tokens
       do NOT trigger 'mr' detection (falls back to 'en'/'hi' unless Marathi marker is present).
    2) Voice /chat/unclear turns 1 & 2 stay under 2 sentences, never ask caller to press a button,
       and hand off on turn 2.
    """
    # Part A: Ambiguous input fails Marathi detection and stays in 'en'
    assert lang("fees?") == "en"
    assert lang("डॉक्टर आज कब आएंगे") == "hi"

    # LLM fallback still receives voice channel context when invoked on obscure voice input
    res_llm = _voice_call("obscure voice tariff question")
    assert mock_classify.called
    assert _sentence_count(res_llm["say"]) < 2
    assert "press" not in res_llm["say"].lower()

    # Part B: Unclear voice turns (1 & 2) obey < 2 sentences and no button prompts
    h = _auth()
    unc_sid = f"unc-v-{uuid.uuid4().hex[:8]}"
    u1 = cl.post("/chat/unclear", json={"session_id": unc_sid, "message": "?"}, headers=h).json()
    u2 = cl.post("/chat/unclear", json={"session_id": unc_sid, "message": "?"}, headers=h).json()
    assert u1["handoff"] is False and u2["handoff"] is True
    assert _sentence_count(u1["reply"]) < 2 and _sentence_count(u2["reply"]) < 2
    assert "automated assistant" in u1["reply"].lower()
    assert "press" not in u1["reply"].lower() and "button" not in u1["reply"].lower()
