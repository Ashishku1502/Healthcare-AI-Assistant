"""Reminders: skips opted-out / no_message patients; marks sent so a reminder is never sent twice."""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import Appointment, Patient, Audit
def due_reminders(db: Session, now: datetime, hours_ahead: int = 24, clinic_id: int | None = None):
    q = db.query(Appointment).filter(Appointment.status == "booked", Appointment.reminded == False, Appointment.start > now, Appointment.start <= now + timedelta(hours=hours_ahead))
    if clinic_id: q = q.filter(Appointment.clinic_id == clinic_id)
    out = []
    for a in q:
        p = db.get(Patient, a.patient_id)
        if p and p.consent and not p.opted_out and not p.no_message:
            out.append({"appt": a.id, "to": p.phone, "text": f"Reminder: appointment on {a.start:%d %b, %I:%M %p}. Reply STOP to opt out."})
    return out
def send_due_reminders(db: Session, now: datetime, send, clinic_id: int | None = None) -> int:
    n = 0
    for r in due_reminders(db, now, clinic_id=clinic_id):
        if send(r["to"], r["text"]):
            db.get(Appointment, r["appt"]).reminded = True; n += 1
    db.commit(); return n
def log_sender(db: Session, clinic_id: int):
    def send(to, text):  # replace with the WhatsApp provider adapter; this only writes an audit line
        db.add(Audit(clinic_id=clinic_id, actor="reminder", action=f"send to ***{to[-4:]}")); return True
    return send
