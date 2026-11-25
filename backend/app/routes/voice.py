"""Telephony adapter endpoint. A provider (Twilio/Exotel/Knowlarity) posts each speech turn here; we answer with text to speak
(and a transfer number on handoff). Real SIP/call-forwarding setup and TTS/STT are done by the provider, not in this repo."""
import hashlib, hmac
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session
from ..config import VOICE_SECRET
from ..database import get_db
from ..models import Clinic, Event, Patient
from .. import receptionist
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
