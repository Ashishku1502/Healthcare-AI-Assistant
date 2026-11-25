from datetime import datetime, timedelta
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .models import Appointment, Doctor, Audit
class BookingError(Exception): pass
def valid_slot(d: Doctor, start: datetime) -> bool:
    if not d.active or str(start.weekday()) not in d.days.split(","): return False
    now_cmp = datetime.now(start.tzinfo) if start.tzinfo else datetime.now()
    if start.hour < d.start_hour or start.hour >= d.end_hour or start < now_cmp: return False
    return (start.hour*60 + start.minute) % d.slot_minutes == 0
def free_slots(db: Session, d: Doctor, day: datetime, limit=6):
    taken = {a.start for a in db.query(Appointment).filter_by(doctor_id=d.id, status="booked")}
    t, out = day.replace(hour=d.start_hour, minute=0, second=0, microsecond=0), []
    while t.hour < d.end_hour and t.date() == day.date() and len(out) < limit:
        if valid_slot(d, t) and t not in taken: out.append(t)
        t += timedelta(minutes=d.slot_minutes)
    return out
def book(db: Session, clinic_id: int, doctor_id: int, patient_id: int, start: datetime, channel: str, actor: str) -> Appointment:
    d = db.get(Doctor, doctor_id)
    if not d or d.clinic_id != clinic_id: raise BookingError("Doctor not found")
    if not valid_slot(d, start): raise BookingError("Slot is outside doctor hours or in the past")
    a = Appointment(clinic_id=clinic_id, doctor_id=doctor_id, patient_id=patient_id, start=start, channel=channel)
    db.add(a)
    try:
        db.flush()  # DB partial-unique index is the real double-booking guard
    except IntegrityError:
        db.rollback(); raise BookingError("Slot already taken")
    db.add(Audit(clinic_id=clinic_id, actor=actor, action=f"book appt doctor={doctor_id} start={start.isoformat()}"))
    db.commit(); return a
