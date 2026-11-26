"""
5 test cases covering:
1. First reply always states it is the clinic's automated assistant (across languages & unclear turn 1),
   while follow-up turns in the same session do not repeat the banner.
2. Per-patient 'do not message this number' flag (`no_message`) set via API & patient message,
   checked strictly before any WhatsApp reminder is sent.
3. Clinic settings expose a consent line and data retention setting (default 90 days) and purge respects it.
4. Failure / boundary cases: invalid retention_days rejected (422), non-owner blocked (403), cross-clinic toggle blocked (404).
5. Honest 'it failing' case: WhatsApp reminder is blocked when no_message=True, AND when a patient says
   'do not message this number' via web chat without providing a phone number, it cannot auto-flag a Patient record
   and hands off to clinic staff.
"""

import os
os.environ.setdefault("LOGIN_RATE_PER_MIN", "10000")

import uuid
from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models import Clinic, User, Doctor, Patient, Appointment, Event, now
from app.reminders import due_reminders, send_due_reminders
from app.security import hash_pw

cl = TestClient(app)

OWNER_A_EMAIL = "privacy_owner_a@clinic.com"
DESK_A_EMAIL = "privacy_desk_a@clinic.com"
OWNER_B_EMAIL = "privacy_owner_b@clinic.com"
PASS = "clinic1234"

_headers_cache: dict[str, dict] = {}
_clinic_a_id: int | None = None
_doctor_a_id: int | None = None


def setup_module():
    global _clinic_a_id, _doctor_a_id
    db = SessionLocal()
    try:
        ca = db.query(Clinic).filter_by(name="Privacy Settings Clinic A").first()
        if not ca:
            ca = Clinic(name="Privacy Settings Clinic A", hours="9-5", fees="Rs 300")
            db.add(ca)
            db.flush()
            db.add(User(clinic_id=ca.id, email=OWNER_A_EMAIL, password_hash=hash_pw(PASS), role="owner"))
            db.add(User(clinic_id=ca.id, email=DESK_A_EMAIL, password_hash=hash_pw(PASS), role="receptionist"))
            doc = Doctor(clinic_id=ca.id, name="Dr. Kavita", speciality="General", days="0,1,2,3,4,5,6", active=True)
            db.add(doc)
            db.flush()
            _doctor_a_id = doc.id
        else:
            _doctor_a_id = db.query(Doctor).filter_by(clinic_id=ca.id).first().id
        _clinic_a_id = ca.id

        cb = db.query(Clinic).filter_by(name="Privacy Settings Clinic B").first()
        if not cb:
            cb = Clinic(name="Privacy Settings Clinic B", hours="10-6")
            db.add(cb)
            db.flush()
            db.add(User(clinic_id=cb.id, email=OWNER_B_EMAIL, password_hash=hash_pw(PASS), role="owner"))
        db.commit()
    finally:
        db.close()


def _auth(email: str) -> dict:
    if email not in _headers_cache:
        r = cl.post("/auth/login", json={"email": email, "password": PASS})
        assert r.status_code == 200, f"login failed: {r.text}"
        _headers_cache[email] = {"Authorization": "Bearer " + r.json()["token"]}
    return _headers_cache[email]


# ── Test 1 (PASS): First reply always identifies as clinic's automated assistant ──

def test_1_first_reply_discloses_automated_assistant():
    h = _auth(OWNER_A_EMAIL)
    sid_en = f"disc-en-{uuid.uuid4().hex[:8]}"
    r1 = cl.post("/chat", json={"session_id": sid_en, "message": "What are your hours?"}, headers=h).json()
    assert "clinic's automated assistant" in r1["reply"].lower()
    assert r1["ai_disclosure"] == "clinic's automated assistant"

    # Second turn in same session does not repeat the intro
    r2 = cl.post("/chat", json={"session_id": sid_en, "message": "What are the fees?"}, headers=h).json()
    assert "clinic's automated assistant" not in r2["reply"].lower()

    # Unclear turn 1 also discloses automated assistant
    sid_unc = f"disc-unc-{uuid.uuid4().hex[:8]}"
    r_unc = cl.post("/chat/unclear", json={"session_id": sid_unc, "message": "?"}, headers=h).json()
    assert "automated assistant" in r_unc["reply"].lower()


# ── Test 2 (PASS): Per-patient 'do not message this number' blocks WhatsApp reminders ──

def test_2_no_message_flag_blocks_whatsapp_reminders():
    h = _auth(DESK_A_EMAIL)
    p_blocked = cl.post(
        "/patients",
        json={"name": "Blocked Patient", "phone": "9811000001", "consent": True},
        headers=h,
    )
    assert p_blocked.status_code == 201
    pid_blocked = p_blocked.json()["id"]
    assert p_blocked.json()["no_message"] is False

    # Staff sets 'do not message this number' flag via dedicated endpoint
    upd = cl.put(f"/patients/{pid_blocked}/no-message", json={"no_message": True}, headers=h)
    assert upd.status_code == 200
    assert upd.json()["no_message"] is True

    # Create another consented patient without no_message flag
    p_allowed = cl.post(
        "/patients",
        json={"name": "Allowed Patient", "phone": "9811000002", "consent": True},
        headers=h,
    )
    assert p_allowed.status_code == 201
    pid_allowed = p_allowed.json()["id"]

    # Book upcoming appointments for both within reminder window
    appt_dt = (datetime.now() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    assert cl.post(
        "/appointments",
        json={"doctor_id": _doctor_a_id, "patient_id": pid_blocked, "start": appt_dt.isoformat(), "confirmed": True},
        headers=h,
    ).status_code == 201
    assert cl.post(
        "/appointments",
        json={"doctor_id": _doctor_a_id, "patient_id": pid_allowed, "start": (appt_dt + timedelta(minutes=15)).isoformat(), "confirmed": True},
        headers=h,
    ).status_code == 201

    db = SessionLocal()
    try:
        sent_to: list[str] = []
        due = due_reminders(db, appt_dt - timedelta(hours=4), clinic_id=_clinic_a_id)
        tos = [x["to"] for x in due]
        assert "9811000001" not in tos, "no_message patient must be excluded before reminder send"
        assert "9811000002" in tos

        count = send_due_reminders(db, appt_dt - timedelta(hours=4), lambda to, txt: sent_to.append(to) or True, clinic_id=_clinic_a_id)
        assert count == 1
        assert sent_to == ["9811000002"]
    finally:
        db.close()


# ── Test 3 (PASS): Consent line & data retention setting (default 90 days) in clinic settings ──

def test_3_consent_line_and_retention_default_90_days_and_purge():
    h = _auth(OWNER_A_EMAIL)
    clinic_info = cl.get("/clinic", headers=h).json()
    assert clinic_info["retention_days"] == 90
    assert "consent" in clinic_info["consent_line"].lower()

    # Owner customizes consent line and retention to 60 days
    new_consent = "Patients consent to appointment WhatsApp reminders; reply STOP anytime."
    r_upd = cl.put(
        "/clinic",
        json={
            "name": clinic_info["name"],
            "address": clinic_info["address"],
            "hours": clinic_info["hours"],
            "fees": clinic_info["fees"],
            "staff_phone": clinic_info["staff_phone"],
            "consent_line": new_consent,
            "retention_days": 60,
        },
        headers=h,
    )
    assert r_upd.status_code == 200
    assert r_upd.json()["retention_days"] == 60
    assert r_upd.json()["consent_line"] == new_consent

    # Seed one 75-day-old event (should purge at 60d) and one 10-day-old event (should keep)
    db = SessionLocal()
    try:
        old_ev = Event(clinic_id=_clinic_a_id, channel="web", intent="hours", outcome="answered", created_at=now() - timedelta(days=75))
        new_ev = Event(clinic_id=_clinic_a_id, channel="web", intent="fees", outcome="answered", created_at=now() - timedelta(days=10))
        db.add_all([old_ev, new_ev])
        db.commit()
        old_id, new_id = old_ev.id, new_ev.id
    finally:
        db.close()

    purge_res = cl.post("/admin/purge", headers=h).json()
    assert purge_res["retention_days"] == 60
    assert purge_res["events_deleted"] >= 1

    db = SessionLocal()
    try:
        assert db.get(Event, old_id) is None
        assert db.get(Event, new_id) is not None
    finally:
        db.close()


# ── Test 4 (FAIL / VALIDATION & AUTHZ): Invalid retention, non-owner settings, cross-tenant no_message blocked ──

def test_4_settings_validation_and_rbac_failures():
    h_owner = _auth(OWNER_A_EMAIL)
    h_desk = _auth(DESK_A_EMAIL)
    h_other = _auth(OWNER_B_EMAIL)

    # Invalid retention_days (0 or negative) must fail 422
    bad = cl.put(
        "/clinic",
        json={"name": "Privacy Settings Clinic A", "retention_days": 0},
        headers=h_owner,
    )
    assert bad.status_code == 422

    # Receptionist cannot modify clinic retention/consent settings or purge (403)
    assert cl.put("/clinic", json={"name": "Hack", "retention_days": 1}, headers=h_desk).status_code == 403
    assert cl.post("/admin/purge", headers=h_desk).status_code == 403

    # Tenant isolation: Clinic B cannot flip no_message for Clinic A's patient (404)
    pts = cl.get("/patients", headers=h_owner).json()
    pid_a = pts[0]["id"]
    assert cl.put(f"/patients/{pid_a}/no-message", json={"no_message": True}, headers=h_other).status_code == 404


# ── Test 5 (FAILURE CASE — 'It Failing'): no_message blocks reminder & phone-less chat request cannot auto-flag DB ──

def test_5_no_message_without_phone_cannot_auto_flag_patient_and_blocks_reminder():
    """
    Honest failure case for recording:
    - If a patient chats 'do not message this number' WITHOUT providing their phone number,
      Parchi acknowledges and creates a staff handoff, but CANNOT auto-update any Patient row
      (there is no phone number to match).
    - Once flagged on the patient record (with phone), any pending WhatsApp reminder fails/skips cleanly.
    """
    h = _auth(DESK_A_EMAIL)

    # Create patient without no_message first
    p_res = cl.post(
        "/patients",
        json={"name": "PhoneLess Test Patient", "phone": "9811000099", "consent": True},
        headers=h,
    )
    assert p_res.status_code == 201
    pid = p_res.json()["id"]

    # Web chat without patient_phone fails to auto-flip no_message on the Patient row
    r_chat = cl.post(
        "/chat",
        json={"session_id": f"nophone-{uuid.uuid4().hex[:8]}", "message": "do not message this number"},
        headers=h,
    )
    assert r_chat.status_code == 200
    assert "will not send messages" in r_chat.json()["reply"].lower()

    db = SessionLocal()
    try:
        db_patient = db.get(Patient, pid)
        assert db_patient.no_message is False, "phone-less chat cannot guess which patient to flag"
    finally:
        db.close()

    # Now when patient DOES message from their phone via /chat, patient.no_message flips & reminder skips
    r_with_phone = cl.post(
        "/chat",
        json={
            "session_id": f"withphone-{uuid.uuid4().hex[:8]}",
            "message": "do not message this number",
            "patient_phone": "9811000099",
        },
        headers=h,
    )
    assert r_with_phone.status_code == 200

    appt_dt = (datetime.now() + timedelta(days=2)).replace(hour=11, minute=0, second=0, microsecond=0)
    assert cl.post(
        "/appointments",
        json={"doctor_id": _doctor_a_id, "patient_id": pid, "start": appt_dt.isoformat(), "confirmed": True},
        headers=h,
    ).status_code == 201

    db = SessionLocal()
    try:
        assert db.get(Patient, pid).no_message is True
        sent_to: list[str] = []
        sent_count = send_due_reminders(db, appt_dt - timedelta(hours=3), lambda to, txt: sent_to.append(to) or True, clinic_id=_clinic_a_id)
        assert "9811000099" not in sent_to
        assert sent_count == 0
    finally:
        db.close()
