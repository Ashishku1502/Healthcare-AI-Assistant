"""Telephony adapter endpoint. A provider (Twilio/Exotel/Knowlarity) posts each speech turn here; we answer with text to speak
(and a transfer number on handoff). Real SIP/call-forwarding setup and TTS/STT are done by the provider, not in this repo."""
import hashlib, hmac, time, urllib.parse
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from sqlalchemy.orm import Session
from ..config import VOICE_SECRET
from ..database import get_db
from ..models import Clinic, Event, Patient
from .. import receptionist
from ..integrations import twilio as twilio_integration

r = APIRouter()
@r.post("/webhooks/voice/{clinic_id}")
async def voice(clinic_id: int, req: Request, x_signature: str = Header(default=""), db: Session = Depends(get_db)):
    raw = await req.body()
    if not hmac.compare_digest(x_signature, hmac.new(VOICE_SECRET.encode(), raw, hashlib.sha256).hexdigest()): raise HTTPException(401, "Bad signature")
    d = await req.json(); c = db.get(Clinic, clinic_id)
    if not (c and d.get("call_id") and d.get("from")): raise HTTPException(422, "Invalid payload")
    s = receptionist.get_session(db, c.id, "voice", d["call_id"])
    speech, conf = (d.get("speech") or "").strip(), float(d.get("confidence", 1))
    if not speech or conf < 0.5: say, handoff = receptionist.unclear_turn(db, s)
    else:
        p = db.query(Patient).filter_by(clinic_id=c.id, phone=d["from"]).first()
        if p and p.opted_out is False and not p.consent: pass
        say = receptionist.reply(db, c, s, p, speech)
        ev = db.get(Event, s.event_id) if s.event_id else None; handoff = bool(ev and ev.outcome in ("handoff", "urgent"))
    return {"say": say, "transfer_to": c.staff_phone if handoff and c.staff_phone else None, "hangup": False}

@r.post("/webhooks/voice/twilio/{clinic_id}")
async def twilio_voice(
    clinic_id: int,
    req: Request,
    x_twilio_signature: str = Header(default=""),
    db: Session = Depends(get_db)
):
    c = db.get(Clinic, clinic_id)
    if not c:
        raise HTTPException(404, "Clinic not found")

    raw = await req.body()
    content_type = req.headers.get("content-type", "")
    if content_type.startswith("application/json"):
        params = await req.json()
    else:
        parsed = urllib.parse.parse_qs(raw.decode("utf-8"))
        params = {k: v[0] if isinstance(v, list) and len(v) == 1 else v for k, v in parsed.items()}

    url = str(req.url)

    if not twilio_integration.verify_twilio_signature(url, params, x_twilio_signature):
        raise HTTPException(401, "Invalid Twilio signature")

    # Check simulated delay header (useful for filler latency tests)
    sim_delay = float(req.headers.get("X-Simulated-Delay", 0.0))
    res = twilio_integration.handle_twilio_turn(
        db, c, params,
        elapsed_seconds=sim_delay,
        action_url=url
    )
    return Response(content=res["twiml"], media_type="application/xml")

@r.post("/webhooks/voice/twilio/{clinic_id}/status")
async def twilio_status(
    clinic_id: int,
    req: Request,
    x_twilio_signature: str = Header(default=""),
    db: Session = Depends(get_db)
):
    c = db.get(Clinic, clinic_id)
    if not c:
        raise HTTPException(404, "Clinic not found")

    raw = await req.body()
    content_type = req.headers.get("content-type", "")
    if content_type.startswith("application/json"):
        params = await req.json()
    else:
        parsed = urllib.parse.parse_qs(raw.decode("utf-8"))
        params = {k: v[0] if isinstance(v, list) and len(v) == 1 else v for k, v in parsed.items()}

    url = str(req.url)

    if not twilio_integration.verify_twilio_signature(url, params, x_twilio_signature):
        raise HTTPException(401, "Invalid Twilio signature")

    try:
        duration = int(params.get("CallDuration", 0))
    except (ValueError, TypeError):
        duration = 0

    if duration > 0:
        twilio_integration.record_call_duration(clinic_id, duration)

    return {"status": "ok", "duration_recorded": duration, "monthly_minutes": twilio_integration.get_monthly_minutes(clinic_id)}

