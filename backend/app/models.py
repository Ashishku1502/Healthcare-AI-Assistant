from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, DateTime, Boolean, Index, UniqueConstraint, text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
def now(): return datetime.now(timezone.utc).replace(tzinfo=None)
class Clinic(Base):
    __tablename__ = "clinics"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    address: Mapped[str] = mapped_column(String(300), default="")
    hours: Mapped[str] = mapped_column(String(200), default="")
    fees: Mapped[str] = mapped_column(String(300), default="")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    staff_phone: Mapped[str] = mapped_column(String(20), default="")  # receptionist number: may text status commands, receives handoff transfers
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    email: Mapped[str] = mapped_column(String(200), unique=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20), default="receptionist")  # owner|receptionist
class Doctor(Base):
    __tablename__ = "doctors"
    id: Mapped[int] = mapped_column(primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    speciality: Mapped[str] = mapped_column(String(120), default="General")
    days: Mapped[str] = mapped_column(String(20), default="0,1,2,3,4,5")  # Mon=0
    start_hour: Mapped[int] = mapped_column(Integer, default=9)
    end_hour: Mapped[int] = mapped_column(Integer, default=17)
    slot_minutes: Mapped[int] = mapped_column(Integer, default=15)
    status_note: Mapped[str] = mapped_column(String(200), default="")  # clinic-verified, e.g. "running 20 min late"
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    status_state: Mapped[str] = mapped_column(String(10), default="unknown")  # unknown|in|late|out (set by receptionist)
    late_minutes: Mapped[int] = mapped_column(Integer, default=0)
    current_token: Mapped[int] = mapped_column(Integer, default=0)
    status_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = (UniqueConstraint("clinic_id", "phone"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20))
    consent: Mapped[bool] = mapped_column(Boolean, default=False)
    opted_out: Mapped[bool] = mapped_column(Boolean, default=False)
    no_message: Mapped[bool] = mapped_column(Boolean, default=False)  # safe-contact: never message this number
class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (Index("uq_active_slot", "doctor_id", "start", unique=True,
        sqlite_where=text("status='booked'"), postgresql_where=text("status='booked'")),)
    id: Mapped[int] = mapped_column(primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"))
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    start: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), default="booked")
    channel: Mapped[str] = mapped_column(String(20), default="dashboard")
    reminded: Mapped[bool] = mapped_column(Boolean, default=False)
class ChatSession(Base):
    __tablename__ = "chat_sessions"
    __table_args__ = (UniqueConstraint("clinic_id", "channel", "external_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"))
    channel: Mapped[str] = mapped_column(String(20))
    external_id: Mapped[str] = mapped_column(String(60))
    pending: Mapped[dict] = mapped_column(JSON, default=dict)
    event_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
class Event(Base):  # one row per contact (not per turn)
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    channel: Mapped[str] = mapped_column(String(20))
    intent: Mapped[str] = mapped_column(String(30), default="other")
    outcome: Mapped[str] = mapped_column(String(30), default="answered")  # answered|booked|handoff|urgent
    note: Mapped[str] = mapped_column(String(200), default="")
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
class WebhookLog(Base):
    __tablename__ = "webhook_log"
    message_id: Mapped[str] = mapped_column(String(100), primary_key=True)
class Audit(Base):
    __tablename__ = "audit"
    id: Mapped[int] = mapped_column(primary_key=True)
    clinic_id: Mapped[int] = mapped_column(Integer)
    actor: Mapped[str] = mapped_column(String(60))
    action: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

class ClinicRule(Base):
    __tablename__ = "clinic_rules"
    id: Mapped[int] = mapped_column(primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    rule_key: Mapped[str] = mapped_column(String(50))
    rule_value: Mapped[str] = mapped_column(String(500))
    version: Mapped[int] = mapped_column(Integer, default=1)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
