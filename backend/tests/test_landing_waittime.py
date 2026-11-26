"""
5 test cases for the wait-time chat demo shown on the landing page.
Tests verify the /chat endpoint returns the right message for each
live-state scenario illustrated in the hero card.

Failure cases (tests 3 & 4) are expected passing tests — they prove
Parchi says "unconfirmed" instead of inventing a wait time.
"""

import uuid
import re
from datetime import timedelta

from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models import Clinic, User, Doctor, now
from app.security import hash_pw

cl = TestClient(app)

LANDING_EMAIL = "landing_test@clinic.com"
LANDING_PASS  = "clinic1234"
_doctor_id: int | None = None


def setup_module():
    """Create an isolated clinic + user + doctor for the landing-page tests."""
    global _doctor_id
    db = SessionLocal()
    clinic = db.query(Clinic).filter_by(name="Landing Test Clinic").first()
    if not clinic:
        clinic = Clinic(name="Landing Test Clinic", hours="9-5", fees="Rs 300")
        db.add(clinic)
        db.flush()
        db.add(User(
            clinic_id=clinic.id,
            email=LANDING_EMAIL,
            password_hash=hash_pw(LANDING_PASS),
            role="receptionist",
        ))
        db.add(Doctor(
            clinic_id=clinic.id,
            name="Dr. Landing",
            speciality="General Physician",
            days="0,1,2,3,4,5,6",
            current_token=12,
        ))
        db.commit()
    db.close()

    # Cache doctor id
    db = SessionLocal()
    _doctor_id = db.query(Doctor).filter_by(name="Dr. Landing").first().id
    db.close()


# ── helpers ──────────────────────────────────────────────────────────────────

def _auth() -> dict:
    r = cl.post("/auth/login", json={"email": LANDING_EMAIL, "password": LANDING_PASS})
    assert r.status_code == 200, f"login failed: {r.text}"
    return {"Authorization": "Bearer " + r.json()["token"]}


def _set_status(state: str, late_minutes: int = 0) -> None:
    headers = _auth()
    r = cl.put(
        f"/doctors/{_doctor_id}/status",
        json={"state": state, "late_minutes": late_minutes},
        headers=headers,
    )
    assert r.status_code == 200, f"set_status failed: {r.text}"


def _force_stale(minutes_ago: int = 35) -> None:
    """Directly patch status_at in DB to make state appear stale."""
    db = SessionLocal()
    try:
        doc = db.query(Doctor).filter_by(id=_doctor_id).first()
        doc.status_at = now() - timedelta(minutes=minutes_ago)
        db.commit()
    finally:
        db.close()


def _chat(message: str) -> str:
    headers = _auth()
    sid = f"landing-{uuid.uuid4().hex[:8]}"
    r = cl.post(
        "/chat",
        json={"session_id": sid, "message": message},
        headers=headers,
    )
    assert r.status_code == 200, f"chat failed: {r.text}"
    return r.json()["reply"].lower()


# ── Test 1 (PASS): Doctor marked 'in' recently — reply confirms presence ─────

def test_1_doctor_in_fresh_reply_confirms_presence():
    """Fresh 'in' status → chat confirms doctor is present, no 'unconfirmed'."""
    _set_status("in", late_minutes=0)
    reply = _chat("Doctor aa gaye kya?")

    assert "unconfirmed" not in reply and "not confirmed" not in reply, \
        f"unexpected unconfirmed in: {reply}"
    assert any(w in reply for w in ["arrived", "in", "available", "present", "here"]), \
        f"no presence word found in: {reply}"


# ── Test 2 (PASS): Doctor 'late' 15 min fresh → mentions delay ───────────────

def test_2_doctor_late_fresh_reply_mentions_late():
    """Fresh 'late +15' status → chat mentions running late, no 'unconfirmed'."""
    _set_status("late", late_minutes=15)
    reply = _chat("Kitna wait hai?")

    assert "unconfirmed" not in reply and "not confirmed" not in reply, \
        f"unexpected unconfirmed in: {reply}"
    assert any(w in reply for w in ["late", "delay", "running", "wait", "15"]), \
        f"no delay word found in: {reply}"


# ── Test 3 (FAIL case handled): Status stale (35 min old) → 'unconfirmed' ────

def test_3_stale_status_returns_unconfirmed():
    """
    FAIL case: receptionist hasn't tapped in >30 min.
    Parchi must say 'unconfirmed'/'not confirmed' and offer token or callback.
    Must never invent or quote the stale 15 minutes as verified.
    """
    _set_status("late", late_minutes=15)
    _force_stale(minutes_ago=35)

    reply = _chat("is the doctor in")

    assert "unconfirmed" in reply or "not confirmed" in reply, \
        f"stale state must say unconfirmed, got: {reply}"
    assert "token" in reply or "callback" in reply, \
        f"stale reply must offer token or callback, got: {reply}"
    assert "15 minutes late" not in reply, \
        f"stale reply must NOT quote stale 15 min as verified: {reply}"


# ── Test 4 (FAIL case handled): Unknown status no timestamp → no invented time

def test_4_unknown_status_no_invented_wait_time():
    """
    FAIL case: 'unknown' / no status_at set.
    Reply must never contain an invented numeric minute value.
    Must say unconfirmed and offer token/callback.
    """
    db = SessionLocal()
    try:
        doc = db.query(Doctor).filter_by(id=_doctor_id).first()
        doc.status_state = "unknown"
        doc.late_minutes = 0
        doc.status_at = None
        db.commit()
    finally:
        db.close()

    reply = _chat("how long is the wait")

    assert "unconfirmed" in reply or "not confirmed" in reply, \
        f"unknown status must say unconfirmed, got: {reply}"
    # Must not invent any specific numeric wait time
    invented = re.search(r"\b\d+\s*min", reply)
    assert not invented, \
        f"reply invented a wait time '{invented.group()}' in: {reply}"
    assert "token" in reply or "callback" in reply, \
        f"must offer token or callback, got: {reply}"


# ── Test 5 (PASS): Doctor 'out' fresh → reply says not in ────────────────────

def test_5_doctor_out_fresh_reply_says_not_in():
    """Fresh 'out' status → chat indicates doctor is not in today."""
    _set_status("out", late_minutes=0)
    reply = _chat("is the doctor in today")

    assert "unconfirmed" not in reply and "not confirmed" not in reply, \
        f"unexpected unconfirmed in: {reply}"
    assert any(w in reply for w in ["not arrived", "not in", "out", "unavailable", "absent", "today", "नाहीत", "आलेले"]), \
        f"no 'not in' phrase found in: {reply}"
