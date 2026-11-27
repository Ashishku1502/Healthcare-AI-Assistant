from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from .config import ORIGIN, LOGIN_RATE, DB_URL
from .database import Base, engine, SessionLocal
from .models import Clinic, User, Doctor
from .security import hash_pw
from .routes import api, whatsapp, voice
import time
from collections import defaultdict
from fastapi import Request
from fastapi.responses import JSONResponse

def _ensure_clinic_columns():
    """Idempotently add new clinic settings columns when running on an existing DB without Alembic."""
    try:
        cols = {c["name"] for c in inspect(engine).get_columns("clinics")}
        with engine.begin() as conn:
            if "consent_line" not in cols:
                conn.execute(text(
                    "ALTER TABLE clinics ADD COLUMN consent_line VARCHAR(500) DEFAULT "
                    "'By messaging or sharing your phone number with the clinic, you consent to receive appointment updates and reminders (reply STOP anytime to opt out).'"
                ))
            if "retention_days" not in cols:
                conn.execute(text("ALTER TABLE clinics ADD COLUMN retention_days INTEGER DEFAULT 90"))
    except Exception as e:
        print(f"ensure_clinic_columns note: {e}")

def init_db():
    try:
        Base.metadata.create_all(engine)
        _ensure_clinic_columns()
        if "test" in DB_URL:
            return
        db = SessionLocal()
        try:
            if not db.query(Clinic).first():
                c = Clinic(
                    name="Care Clinic",
                    address="12 MG Road, Nagpur",
                    hours="Mon-Sat 9 AM - 5 PM",
                    fees="Consultation Rs 300",
                    is_demo=False,
                )
                db.add(c)
                db.flush()
                db.add_all([
                    User(clinic_id=c.id, email="owner@clinic.com", password_hash=hash_pw("clinic1234"), role="owner"),
                    User(clinic_id=c.id, email="desk@clinic.com", password_hash=hash_pw("clinic1234"), role="receptionist"),
                    Doctor(clinic_id=c.id, name="Neha Sharma", speciality="General Physician", days="0,1,2,3,4,5", start_hour=9, end_hour=17, slot_minutes=15, active=True),
                    Event(clinic_id=c.id, channel="voice", intent="emergency", outcome="urgent", note="Patient reported sudden chest discomfort & shortness of breath. 112 emergency routing advised; staff phone alerted.", resolved=False),
                    Event(clinic_id=c.id, channel="whatsapp", intent="report", outcome="handoff", note="Sunita Verma (+91 98200 11223) shared CBC lab report; requested Dr. Neha review.", resolved=False),
                    Event(clinic_id=c.id, channel="voice", intent="prescription", outcome="handoff", note="Ramesh Patil (+91 98450 33445) requested refill for BP medicine (Amlodipine 5mg).", resolved=False),
                ])
                db.commit()
        finally:
            db.close()
    except Exception as e:
        print(f"init_db note: {e}")

init_db()
import os
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI(title="Parchi AI API")
static_path = Path("/tmp/parchi_static") if os.getenv("VERCEL") else (Path(__file__).resolve().parent / "static")
static_path.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"]
    if ORIGIN == "*"
    else list({ORIGIN, "https://frontend-bice-eight-7xnlf654ep.vercel.app", "http://localhost:3000", "http://127.0.0.1:3000"}),
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api.r); app.include_router(whatsapp.r); app.include_router(voice.r)
_hits: dict = defaultdict(list)
@app.middleware("http")
async def rate_limit(req: Request, nxt):  # per-IP, in-memory (single process). Use Redis in production.
    if req.url.path == "/auth/login" or req.url.path.startswith("/webhooks"):
        k = (req.client.host if req.client else "?", req.url.path.split("/")[1]); t = time.time()
        _hits[k] = [x for x in _hits[k] if t - x < 60]
        if len(_hits[k]) >= (120 if k[1] == "webhooks" else LOGIN_RATE): return JSONResponse({"detail": "Too many requests"}, 429)
        _hits[k].append(t)
    return await nxt(req)
@app.get("/health")
def health(): return {"status": "ok"}
@app.get("/")
def root(): return {"service": "Parchi AI Backend", "status": "healthy", "docs": "/docs", "health": "/health"}
