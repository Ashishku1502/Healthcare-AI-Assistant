import hashlib, hmac, re
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session
from ..config import WA_SECRET
from ..database import get_db
from ..models import Clinic, Patient, WebhookLog, Doctor, Audit, now
from .. import receptionist
r = APIRouter()
@r.post("/webhooks/whatsapp/{clinic_id}")
async def wa(clinic_id: int, req: Request, x_signature: str = Header(default=""), db: Session = Depends(get_db)):
    raw = await req.body()
    if not hmac.compare_digest(x_signature, hmac.new(WA_SECRET.encode(), raw, hashlib.sha256).hexdigest()):
        raise HTTPException(401, "Bad signature")
    data = await req.json(); mid, frm, text = data.get("message_id"), data.get("from"), data.get("text", "")
    c = db.get(Clinic, clinic_id)
    if not (mid and frm and c): raise HTTPException(422, "Invalid payload")
    if db.get(WebhookLog, mid): return {"reply": None, "duplicate": True}  # idempotent
    db.add(WebhookLog(message_id=mid))
    cmd = re.fullmatch(r"\s*(arrived|aaye|in|out|nahi aaye|late)\s*(\d{1,3})?\s*", text, re.I)
    if cmd and c.staff_phone and frm == c.staff_phone:  # receptionist texts the status: the live source of truth
        w = cmd.group(1).lower(); st = "late" if w == "late" else ("out" if w in ("out", "nahi aaye") else "in")
        for d in db.query(Doctor).filter_by(clinic_id=c.id, active=True):
            d.status_state, d.late_minutes, d.status_at = st, int(cmd.group(2) or 30) if st == "late" else 0, now()
        db.add(Audit(clinic_id=c.id, actor="staff-whatsapp", action=f"status {st}")); db.commit()
        return {"reply": f"Status set: {st}. Patients will be told this."}
    p = db.query(Patient).filter_by(clinic_id=c.id, phone=frm).first()
    if re.fullmatch(r"\s*(stop|unsubscribe|रोकें)\s*", text, re.I):
        if not p: p = Patient(clinic_id=c.id, name="WhatsApp user", phone=frm); db.add(p)
        p.opted_out, p.consent = True, False; db.commit()
        return {"reply": "You have been unsubscribed. No further messages will be sent."}
    if p and p.opted_out: db.commit(); return {"reply": None, "opted_out": True}
    if not p: p = Patient(clinic_id=c.id, name="WhatsApp user", phone=frm, consent=True); db.add(p); db.flush()  # consent by user-initiated chat
    s = receptionist.get_session(db, c.id, "whatsapp", frm)
    return {"reply": receptionist.reply(db, c, s, p, text)}
