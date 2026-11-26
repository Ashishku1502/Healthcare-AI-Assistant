import os
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import Clinic, User, Doctor, ChatSession, Event, now
from app.security import hash_pw

cl = TestClient(app)

def setup_module():
    db = SessionLocal()
    c = db.query(Clinic).filter_by(name="Mobile Reception Clinic").first()
    if not c:
        c = Clinic(name="Mobile Reception Clinic", hours="9-5", fees="Rs 300")
        db.add(c)
        db.flush()
        db.add(User(clinic_id=c.id, email="receptionist_phone@clinic.com", password_hash=hash_pw("clinic1234"), role="receptionist"))
        db.add(Doctor(clinic_id=c.id, name="Dr. Neha", speciality="General Physician", days="0,1,2,3,4,5,6", current_token=12))
        db.commit()
    db.close()

def get_auth_token():
    res = cl.post("/auth/login", json={"email": "receptionist_phone@clinic.com", "password": "clinic1234"})
    return {"Authorization": "Bearer " + res.json()["token"]}

def test_1_doctor_in_status_fresh():
    """Case 1: Receptionist taps 'Doctor in' -> status is fresh -> chat answers doctor is in."""
    headers = get_auth_token()
    db = SessionLocal()
    doc = db.query(Doctor).filter_by(name="Dr. Neha").first()
    doc_id = doc.id
    db.close()

    # 1. Tap 'Doctor in'
    put_res = cl.put(f"/doctors/{doc_id}/status", json={"state": "in", "late_minutes": 0}, headers=headers)
    assert put_res.status_code == 200
    data = put_res.json()
    assert data["status_state"] == "in"
    assert data["late_minutes"] == 0
    assert data["is_fresh"] is True

    # 2. Ask chat: 'is the doctor in'
    chat_res = cl.post("/chat", json={"session_id": "test_sess_in_1", "message": "is the doctor in"}, headers=headers)
    assert chat_res.status_code == 200
    reply = chat_res.json()["reply"]
    # Must report doctor has arrived / is in
    assert "Dr. Neha has arrived" in reply or "arrived" in reply or "in" in reply.lower()
    # Live state must not say unconfirmed
    assert "unconfirmed" not in reply.lower()

def test_2_running_late_15_min():
    """Case 2: Receptionist taps 'Running late +15 min' -> chat answers running 15 min late (never invents time)."""
    headers = get_auth_token()
    db = SessionLocal()
    doc = db.query(Doctor).filter_by(name="Dr. Neha").first()
    doc_id = doc.id
    db.close()

    # 1. Tap 'Running late +15 min'
    put_res = cl.put(f"/doctors/{doc_id}/status", json={"state": "late", "late_minutes": 15}, headers=headers)
    assert put_res.status_code == 200
    assert put_res.json()["status_state"] == "late"
    assert put_res.json()["late_minutes"] == 15

    # 2. Ask chat: 'how long is the wait'
    chat_res = cl.post("/chat", json={"session_id": "test_sess_late_1", "message": "how long is the wait"}, headers=headers)
    assert chat_res.status_code == 200
    reply = chat_res.json()["reply"]
    # Must report exactly 15 minutes late from receptionist state
    assert "15 minutes late" in reply
    assert "unconfirmed" not in reply.lower()

def test_3_not_in_today():
    """Case 3: Receptionist taps 'Not in today' -> chat answers doctor not in / has not arrived."""
    headers = get_auth_token()
    db = SessionLocal()
    doc = db.query(Doctor).filter_by(name="Dr. Neha").first()
    doc_id = doc.id
    db.close()

    # 1. Tap 'Not in today'
    put_res = cl.put(f"/doctors/{doc_id}/status", json={"state": "out", "late_minutes": 0}, headers=headers)
    assert put_res.status_code == 200
    assert put_res.json()["status_state"] == "out"

    # 2. Ask chat: 'is the doctor in'
    chat_res = cl.post("/chat", json={"session_id": "test_sess_out_1", "message": "is the doctor in today"}, headers=headers)
    assert chat_res.status_code == 200
    reply = chat_res.json()["reply"]
    # Must report doctor has not arrived / not in today
    assert "not arrived" in reply.lower() or "not in" in reply.lower()

def test_4_stale_over_30_minutes_fails_to_unconfirmed():
    """Case 4 (Failing condition handled safely): State older than 30 mins -> unconfirmed, never guess, offer token/callback."""
    headers = get_auth_token()
    db = SessionLocal()
    doc = db.query(Doctor).filter_by(name="Dr. Neha").first()
    # Force state to be 35 minutes stale (> 30 min limit)
    doc.status_state = "late"
    doc.late_minutes = 20
    doc.status_at = now() - timedelta(minutes=35)
    db.commit()
    doc_id = doc.id
    db.close()

    # 1. Check get_doctor_status confirms is_fresh is False
    status_res = cl.get(f"/doctors/{doc_id}/status", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()["is_fresh"] is False

    # 2. Ask chat: 'is the doctor in' or 'how long is the wait'
    chat_res = cl.post("/chat", json={"session_id": "test_sess_stale_1", "message": "how long is the wait"}, headers=headers)
    assert chat_res.status_code == 200
    reply = chat_res.json()["reply"]
    # Must report unconfirmed / not confirmed
    assert "not confirmed" in reply.lower() or "unconfirmed" in reply.lower()
    # Must NOT invent or quote the stale 20 minutes as verified
    assert "20 minutes late" not in reply
    # Must offer token or callback
    assert "token" in reply.lower()
    assert "callback" in reply.lower()

def test_5_missing_state_never_invents_wait():
    """Case 5: When no live state has ever been set, chat NEVER invents a wait time and offers token/callback."""
    headers = get_auth_token()
    db = SessionLocal()
    doc = db.query(Doctor).filter_by(name="Dr. Neha").first()
    # Clear live state completely
    doc.status_state = "unknown"
    doc.late_minutes = 0
    doc.status_at = None
    db.commit()
    doc_id = doc.id
    db.close()

    # Query wait
    chat_res = cl.post("/chat", json={"session_id": "test_sess_unknown_1", "message": "doctor aa gaye kya kitna wait hai"}, headers=headers)
    assert chat_res.status_code == 200
    reply = chat_res.json()["reply"]
    # Strict refusal to invent wait minutes
    assert "not confirmed" in reply.lower() or "unconfirmed" in reply.lower()
    assert "token" in reply.lower()
    assert "callback" in reply.lower()
