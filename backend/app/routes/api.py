from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import *
from ..models import now
from ..schemas import *
from ..security import current_user, owner_only, verify_pw, make_token, hash_pw
from ..booking import book, BookingError
from .. import receptionist
r = APIRouter()
@r.post("/auth/login")
def login(b: Login, db: Session = Depends(get_db)):
    email = b.email.strip().lower()
    u = db.query(User).filter(func.lower(User.email) == email).first()
    if not u or not verify_pw(b.password, u.password_hash): raise HTTPException(401, "Wrong email or password")
    c = db.get(Clinic, u.clinic_id)
    return {
        "token": make_token(u.id),
        "role": u.role,
        "clinic_id": u.clinic_id,
        "clinic_name": c.name if c else "My Clinic",
        "email": u.email
    }

@r.post("/auth/signup", status_code=201)
@r.post("/auth/register", status_code=201)
def signup(b: Signup, db: Session = Depends(get_db)):
    email = b.email.strip().lower()
    if "@" not in email or "." not in email:
        raise HTTPException(422, "Please enter a valid email address")
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(409, "An account with this email already exists")
    
    # 1. Create Clinic
    c = Clinic(
        name=b.clinic_name.strip(),
        address=b.address.strip(),
        hours=b.hours.strip() or "Mon-Sat 9:00 AM - 7:00 PM",
        fees=b.fees.strip() or "Consultation Rs 300",
        staff_phone=b.staff_phone.strip(),
        is_demo=False
    )
    db.add(c)
    db.flush()
    
    # 2. Create Owner User
    u = User(
        clinic_id=c.id,
        email=email,
        password_hash=hash_pw(b.password),
        role="owner"
    )
    db.add(u)
    db.flush()
    
    # 3. Create Default Primary Doctor
    doc_name = b.doctor_name.strip() if b.doctor_name.strip() else "Chief Medical Officer"
    d = Doctor(
        clinic_id=c.id,
        name=doc_name,
        speciality=b.speciality.strip() or "General Physician",
        days="0,1,2,3,4,5",
        start_hour=9,
        end_hour=19,
        slot_minutes=15,
        status_state="in",
        active=True
    )
    db.add(d)
    db.add(Audit(clinic_id=c.id, actor=email, action="clinic registered"))
    db.commit()
    
    token = make_token(
        u.id,
        extra={
            "cn": c.name,
            "em": u.email,
            "rl": u.role,
            "dn": doc_name,
            "ad": c.address,
            "hr": c.hours,
            "fe": c.fees,
            "sp": c.staff_phone,
        },
    )

    return {
        "token": token,
        "role": u.role,
        "clinic_id": u.clinic_id,
        "clinic_name": c.name,
        "email": u.email
    }

@r.get("/auth/me")
def auth_me(u: User = Depends(current_user), db: Session = Depends(get_db)):
    c = db.get(Clinic, u.clinic_id)
    return {
        "id": u.id,
        "email": u.email,
        "role": u.role,
        "clinic_id": u.clinic_id,
        "clinic_name": c.name if c else "",
        "is_demo": c.is_demo if c else False
    }
@r.get("/clinic")
def clinic(u: User = Depends(current_user), db: Session = Depends(get_db)):
    c = db.get(Clinic, u.clinic_id)
    return {
        "id": c.id,
        "name": c.name,
        "address": c.address,
        "hours": c.hours,
        "fees": c.fees,
        "staff_phone": c.staff_phone,
        "consent_line": c.consent_line,
        "retention_days": c.retention_days if c.retention_days is not None else 90,
        "is_demo": c.is_demo,
    }
@r.put("/clinic")
def upd_clinic(b: ClinicIn, u: User = Depends(owner_only), db: Session = Depends(get_db)):
    c = db.get(Clinic, u.clinic_id)
    for k, v in b.model_dump().items(): setattr(c, k, v)
    db.add(Audit(clinic_id=c.id, actor=u.email, action=f"update clinic (retention={c.retention_days}d)"))
    db.commit()
    return {"ok": True, "consent_line": c.consent_line, "retention_days": c.retention_days}
def own(db, model, id, u):
    o = db.get(model, id)
    if not o or o.clinic_id != u.clinic_id: raise HTTPException(404, "Not found")  # tenant isolation
    return o
@r.get("/doctors", response_model=list[DoctorOut])
def doctors(u: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.query(Doctor).filter_by(clinic_id=u.clinic_id).all()
@r.post("/doctors", response_model=DoctorOut, status_code=201)
def add_doctor(b: DoctorIn, u: User = Depends(owner_only), db: Session = Depends(get_db)):
    if b.end_hour <= b.start_hour: raise HTTPException(422, "end_hour must be after start_hour")
    d = Doctor(clinic_id=u.clinic_id, **b.model_dump()); db.add(d); db.commit(); return d
@r.put("/doctors/{id}", response_model=DoctorOut)
def upd_doctor(id: int, b: DoctorIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    d = own(db, Doctor, id, u)
    for k, v in b.model_dump().items(): setattr(d, k, v)
    db.commit(); return d
@r.delete("/doctors/{id}", status_code=204)
def deactivate(id: int, u: User = Depends(owner_only), db: Session = Depends(get_db)):
    own(db, Doctor, id, u).active = False; db.commit()  # soft delete keeps history
@r.get("/patients", response_model=list[PatientOut])
def patients(q: str = "", u: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.query(Patient).filter(Patient.clinic_id == u.clinic_id, Patient.name.ilike(f"%{q}%")).limit(100).all()
@r.post("/patients", response_model=PatientOut, status_code=201)
def add_patient(b: PatientIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    if db.query(Patient).filter_by(clinic_id=u.clinic_id, phone=b.phone).first(): raise HTTPException(409, "Phone already registered")
    p = Patient(clinic_id=u.clinic_id, **b.model_dump()); db.add(p); db.commit(); return p
@r.put("/patients/{id}/no-message", response_model=PatientOut)
def set_patient_no_message(id: int, b: NoMessageIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    """Toggle the per-patient 'do not message this number' flag."""
    p = own(db, Patient, id, u)
    p.no_message = b.no_message
    db.add(Audit(clinic_id=u.clinic_id, actor=u.email, action=f"patient {id} no_message={b.no_message}"))
    db.commit()
    return p
@r.get("/appointments", response_model=list[ApptOut])
def appts(u: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.query(Appointment).filter_by(clinic_id=u.clinic_id).order_by(Appointment.start).limit(200).all()
@r.post("/appointments", response_model=ApptOut, status_code=201)
def make_appt(b: ApptIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    if not b.confirmed: raise HTTPException(422, "Explicit confirmation required")  # server-enforced
    own(db, Patient, b.patient_id, u)
    doc = own(db, Doctor, b.doctor_id, u)
    if not doc.active: raise HTTPException(400, "Doctor is inactive")
    start_dt = b.start.replace(tzinfo=None) if b.start.tzinfo else b.start
    try: return book(db, u.clinic_id, b.doctor_id, b.patient_id, start_dt, "dashboard", u.email)
    except BookingError as e: raise HTTPException(409, str(e))
@r.post("/appointments/{id}/cancel", response_model=ApptOut)
def cancel(id: int, u: User = Depends(current_user), db: Session = Depends(get_db)):
    a = own(db, Appointment, id, u); a.status = "cancelled"
    db.add(Audit(clinic_id=u.clinic_id, actor=u.email, action=f"cancel appt {id}")); db.commit(); return a
@r.post("/chat")
def chat(b: ChatIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    c = db.get(Clinic, u.clinic_id); s = receptionist.get_session(db, c.id, b.channel, b.session_id)
    p = None
    if b.patient_phone:
        p = db.query(Patient).filter_by(clinic_id=c.id, phone=b.patient_phone).first()
        if not p:
            p = Patient(clinic_id=c.id, name=b.patient_name or "Web Patient", phone=b.patient_phone, consent=True)
            db.add(p); db.flush()
        elif b.patient_name and p.name != b.patient_name:
            p.name = b.patient_name; db.flush()
    reply_text = receptionist.reply(db, c, s, p, b.message)
    ev = db.get(Event, s.event_id) if s.event_id else None
    intent = ev.intent if ev else "other"
    outcome = ev.outcome if ev else "answered"
    handoff = outcome in ("handoff", "urgent")
    from .. import llm
    return {
        "reply": reply_text,
        "ai_disclosure": "clinic's automated assistant",
        "intent": intent,
        "outcome": outcome,
        "language": receptionist.lang(b.message),
        "handoff": handoff,
        "transfer_to": c.staff_phone if (handoff and c.staff_phone) else None,
        "llm_status": llm.get_llm_status(c.id),
    }

@r.get("/llm/status")
def llm_status(u: User = Depends(current_user)):
    from .. import llm
    from ..integrations import twilio as twilio_integration
    from ..config import VOICE_MONTHLY_MINUTE_CAP
    info = llm.get_llm_status(u.clinic_id)
    info["voice_minutes_used"] = round(twilio_integration.get_monthly_minutes(u.clinic_id), 1)
    info["voice_minute_cap"] = VOICE_MONTHLY_MINUTE_CAP
    return info
@r.get("/analytics")
def analytics(days: int = 30, u: User = Depends(current_user), db: Session = Depends(get_db)):
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    rows = db.query(Event.outcome, func.count()).filter(Event.clinic_id == u.clinic_id, Event.created_at >= since).group_by(Event.outcome).all()
    by_ch = db.query(Event.channel, func.count()).filter(Event.clinic_id == u.clinic_id, Event.created_at >= since).group_by(Event.channel).all()
    o = dict(rows)
    return {"days": days, "contacts": sum(o.values()), "by_outcome": o, "by_channel": dict(by_ch), "source": "events table (1 row per contact)"}

@r.put("/doctors/{id}/status")
def doctor_status(id: int, b: StatusIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    """One-tap live state from the receptionist (the source of truth for wait answers)."""
    d = own(db, Doctor, id, u)
    d.status_state, d.late_minutes, d.status_at = b.state, b.late_minutes, now()
    db.add(Audit(clinic_id=u.clinic_id, actor=u.email, action=f"doctor {id} status {b.state} {b.late_minutes}"))
    db.commit()
    return {
        "ok": True,
        "id": d.id,
        "name": d.name,
        "status_state": d.status_state,
        "late_minutes": d.late_minutes,
        "status_at": d.status_at.isoformat() if d.status_at else None,
        "is_fresh": True,
        "current_token": d.current_token or 0
    }

@r.get("/doctors/{id}/status")
def get_doctor_status(id: int, u: User = Depends(current_user), db: Session = Depends(get_db)):
    """Fetch doctor live state, timestamp, and freshness status."""
    d = own(db, Doctor, id, u)
    is_fresh = bool(d.status_at and (now() - d.status_at <= timedelta(minutes=30)))
    return {
        "id": d.id,
        "name": d.name,
        "status_state": d.status_state,
        "late_minutes": d.late_minutes,
        "status_at": d.status_at.isoformat() if d.status_at else None,
        "is_fresh": is_fresh,
        "current_token": d.current_token or 0
    }

@r.post("/doctors/{id}/next-token", response_model=DoctorOut)
def next_token(id: int, u: User = Depends(current_user), db: Session = Depends(get_db)):
    """One-tap 'next token' by receptionist."""
    d = own(db, Doctor, id, u)
    d.current_token = (d.current_token or 0) + 1
    db.add(Audit(clinic_id=u.clinic_id, actor=u.email, action=f"doctor {id} next token {d.current_token}"))
    db.commit()
    return d

@r.put("/doctors/{id}/token", response_model=DoctorOut)
def set_token(id: int, b: dict, u: User = Depends(current_user), db: Session = Depends(get_db)):
    """Set doctor's current token directly."""
    d = own(db, Doctor, id, u)
    token_val = int(b.get("token", (d.current_token or 0) + 1))
    d.current_token = max(0, token_val)
    db.add(Audit(clinic_id=u.clinic_id, actor=u.email, action=f"doctor {id} set token {d.current_token}"))
    db.commit()
    return d
@r.get("/attention")
def attention(u: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Event).filter(Event.clinic_id == u.clinic_id, Event.outcome.in_(["handoff", "urgent"]), Event.resolved == False).order_by(Event.id.desc()).limit(30).all()
    return [{"id": e.id, "outcome": e.outcome, "intent": e.intent, "channel": e.channel, "note": e.note, "at": e.created_at} for e in rows]
@r.get("/safety-logs")
def safety_logs(u: User = Depends(current_user), db: Session = Depends(get_db)):
    """List every pre-model safety check trigger logged for this clinic."""
    rows = db.query(SafetyTriggerLog).filter_by(clinic_id=u.clinic_id).order_by(SafetyTriggerLog.id.desc()).limit(100).all()
    return [
        {
            "id": x.id,
            "channel": x.channel,
            "session_id": x.session_id,
            "category": x.category,
            "trigger_rule": x.trigger_rule,
            "message_excerpt": x.message_excerpt,
            "staff_alerted": x.staff_alerted,
            "ai_skipped": x.ai_skipped,
            "created_at": x.created_at,
        }
        for x in rows
    ]
@r.post("/attention/{id}/resolve")
def resolve(id: int, u: User = Depends(current_user), db: Session = Depends(get_db)):
    own(db, Event, id, u).resolved = True; db.commit(); return {"ok": True}

@r.post("/chat/unclear")
def unclear(b: ChatIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    c = db.get(Clinic, u.clinic_id)
    s = receptionist.get_session(db, u.clinic_id, "voice-sim", b.session_id)
    reply, handoff = receptionist.unclear_turn(db, s)
    return {
        "reply": reply,
        "handoff": handoff,
        "transfer_to": c.staff_phone if (handoff and c and c.staff_phone) else None,
    }

@r.post("/reminders/run")
def run_reminders(u: User = Depends(owner_only), db: Session = Depends(get_db)):
    """Call from cron every 15 min. Uses LogSender until a real provider adapter is plugged in."""
    from ..reminders import send_due_reminders, log_sender
    return {"sent": send_due_reminders(db, now(), log_sender(db, u.clinic_id), clinic_id=u.clinic_id)}
@r.post("/admin/purge")
def purge(u: User = Depends(owner_only), db: Session = Depends(get_db)):
    from ..retention import purge_old
    from ..config import RETENTION_DAYS
    c = db.get(Clinic, u.clinic_id)
    days = c.retention_days if (c and c.retention_days) else RETENTION_DAYS
    return purge_old(db, u.clinic_id, days=days)

# ---- Owner-only Clinic Rules Settings ----
@r.get("/rules", response_model=list[RuleOut])
def get_rules(u: User = Depends(owner_only), db: Session = Depends(get_db)):
    """Owner-only: list all active rules for the clinic."""
    return db.query(ClinicRule).filter_by(clinic_id=u.clinic_id, active=True).order_by(ClinicRule.rule_key).all()

@r.get("/rules/history")
def get_rules_history(u: User = Depends(owner_only), db: Session = Depends(get_db)):
    """Owner-only: view audited history and version log of clinic rules."""
    rules = db.query(ClinicRule).filter_by(clinic_id=u.clinic_id).order_by(ClinicRule.id.desc()).all()
    audits = db.query(Audit).filter(Audit.clinic_id == u.clinic_id, Audit.action.startswith("rule ")).order_by(Audit.id.desc()).all()
    return {
        "rules": [RuleOut.model_validate(r) for r in rules],
        "audits": [{"id": a.id, "actor": a.actor, "action": a.action, "created_at": a.created_at} for a in audits]
    }

@r.post("/rules", response_model=RuleOut, status_code=201)
def set_rule(b: RuleIn, u: User = Depends(owner_only), db: Session = Depends(get_db)):
    """Owner-only: create or update a versioned, audited clinic rule."""
    key = b.rule_key.strip().lower()
    val = b.rule_value.strip()

    # Safety invariant: local rules can never override urgent/safety/identity/safe-contact
    forbidden = ["emergency", "urgent", "112", "override safety", "safe-contact", "bypass identity"]
    if any(f in key for f in forbidden):
        raise HTTPException(422, "Rule key cannot attempt to override safety boundaries")

    existing = db.query(ClinicRule).filter_by(clinic_id=u.clinic_id, rule_key=key, active=True).first()
    new_version = (existing.version + 1) if existing else 1
    if existing:
        existing.active = False

    rule = ClinicRule(
        clinic_id=u.clinic_id,
        rule_key=key,
        rule_value=val,
        version=new_version,
        active=True,
        created_by=u.email
    )
    db.add(rule)
    db.add(Audit(
        clinic_id=u.clinic_id,
        actor=u.email,
        action=f"rule {key} v{new_version} set to: {val[:100]}"
    ))
    db.commit()
    db.refresh(rule)
    return rule

