"""Creates seed data. Run: python seed.py"""
from app.database import Base, engine, SessionLocal
from app.models import *
from app.security import hash_pw
Base.metadata.create_all(engine); db = SessionLocal()
if not db.query(Clinic).first():
    c = Clinic(name="Care Clinic", address="12 MG Road, Nagpur", hours="Mon-Sat 9 AM - 5 PM", fees="Consultation Rs 300", is_demo=False); db.add(c); db.flush()
    db.add_all([User(clinic_id=c.id, email="owner@clinic.com", password_hash=hash_pw("clinic1234"), role="owner"),
                User(clinic_id=c.id, email="desk@clinic.com", password_hash=hash_pw("clinic1234"), role="receptionist"),
                Doctor(clinic_id=c.id, name="Neha Sharma", speciality="General Physician")])
    db.commit(); print("Seeded. Login owner@clinic.com / clinic1234")
