from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
class Login(BaseModel): email: str; password: str
class Signup(BaseModel):
    clinic_name: str = Field(min_length=2, max_length=120)
    doctor_name: str = Field(default="Doctor", min_length=2, max_length=120)
    speciality: str = Field(default="General Physician", max_length=120)
    email: str = Field(min_length=5, max_length=200)
    password: str = Field(min_length=6, max_length=100)
    staff_phone: str = Field(default="", max_length=20)
    address: str = Field(default="", max_length=300)
    hours: str = Field(default="Mon-Sat 9:00 AM - 7:00 PM", max_length=200)
    fees: str = Field(default="Consultation Rs 300", max_length=300)
class DoctorIn(BaseModel):
    name: str = Field(min_length=2, max_length=120); speciality: str = "General"
    days: str = "0,1,2,3,4,5"; start_hour: int = Field(9, ge=0, le=23); end_hour: int = Field(17, ge=1, le=24)
    slot_minutes: int = Field(15, ge=5, le=120); status_note: str = ""; active: bool = True
    current_token: int = Field(0, ge=0)
class DoctorOut(DoctorIn):
    model_config = ConfigDict(from_attributes=True); id: int; current_token: int = 0; status_state: str = "unknown"; late_minutes: int = 0; status_at: datetime | None = None
class PatientIn(BaseModel):
    name: str = Field(min_length=2); phone: str = Field(pattern=r"^\+?\d{10,13}$"); consent: bool = False; no_message: bool = False
class PatientOut(PatientIn):
    model_config = ConfigDict(from_attributes=True); id: int; opted_out: bool
class NoMessageIn(BaseModel):
    no_message: bool
class ApptIn(BaseModel): doctor_id: int; patient_id: int; start: datetime; confirmed: bool
class ApptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True); id: int; doctor_id: int; patient_id: int; start: datetime; status: str; channel: str
class ClinicIn(BaseModel):
    name: str
    address: str = ""
    hours: str = ""
    fees: str = ""
    staff_phone: str = ""
    consent_line: str = Field(
        default="By messaging or sharing your phone number with the clinic, you consent to receive appointment updates and reminders (reply STOP anytime to opt out).",
        max_length=500,
    )
    retention_days: int = Field(default=90, ge=1, le=3650)
class ChatIn(BaseModel): session_id: str = Field(min_length=3, max_length=60); message: str = Field(min_length=1, max_length=500); patient_name: str | None = None; patient_phone: str | None = None; channel: str = Field(default="web", pattern="^(web|voice|voice-sim|whatsapp)$")
class StatusIn(BaseModel): state: str = Field(pattern="^(in|late|out)$"); late_minutes: int = Field(0, ge=0, le=480)
class RuleIn(BaseModel):
    rule_key: str = Field(min_length=2, max_length=50)
    rule_value: str = Field(min_length=1, max_length=500)
class RuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    clinic_id: int
    rule_key: str
    rule_value: str
    version: int
    active: bool
    created_by: str
    created_at: datetime
