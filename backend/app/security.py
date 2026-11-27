import base64
import hashlib
import hmac
import json
import os
import time
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from .config import SECRET
from .database import get_db
from .models import Clinic, Doctor, User


def hash_pw(pw: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    return base64.b64encode(salt).decode() + "$" + hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 120_000).hex()


def verify_pw(pw: str, stored: str) -> bool:
    s, _ = stored.split("$")
    return hmac.compare_digest(hash_pw(pw, base64.b64decode(s)), stored)


def make_token(uid: int, ttl: int = 8 * 3600, extra: dict | None = None) -> str:
    exp = int(time.time()) + ttl
    if extra is not None and os.getenv("VERCEL") and not os.getenv("DATABASE_URL"):
        payload_b64 = base64.urlsafe_b64encode(json.dumps(extra, separators=(",", ":")).encode()).decode().rstrip("=")
        p = f"{uid}.{exp}.{payload_b64}"
    else:
        p = f"{uid}.{exp}"
    return p + "." + hmac.new(SECRET.encode(), p.encode(), hashlib.sha256).hexdigest()


def _hydrate_ephemeral_vercel_user(db: Session, uid: int, meta: dict) -> User | None:
    """When Vercel runs without a persistent DATABASE_URL, hydrate a signed user across serverless instances."""
    clinic_name = str(meta.get("cn") or "My Clinic")[:120]
    email = str(meta.get("em") or f"user{uid}@clinic.com").lower()[:200]
    role = str(meta.get("rl") or "owner")[:30]
    doc_name = str(meta.get("dn") or "Doctor")[:120]

    existing_email = db.query(User).filter_by(email=email).first()
    if existing_email:
        return existing_email

    c = Clinic(
        name=clinic_name,
        address=str(meta.get("ad") or "")[:300],
        hours=str(meta.get("hr") or "Mon-Sat 9:00 AM - 7:00 PM")[:200],
        fees=str(meta.get("fe") or "Consultation Rs 300")[:300],
        staff_phone=str(meta.get("sp") or "")[:20],
        is_demo=False,
    )
    db.add(c)
    db.flush()
    u = User(
        clinic_id=c.id,
        email=email,
        password_hash=hash_pw(os.urandom(12).hex()),
        role=role,
    )
    db.add(u)
    db.flush()
    db.add(
        Doctor(
            clinic_id=c.id,
            name=doc_name,
            speciality="General Physician",
            days="0,1,2,3,4,5",
            start_hour=9,
            end_hour=19,
            slot_minutes=15,
            status_state="in",
            active=True,
        )
    )
    db.commit()
    db.refresh(u)
    return u


def current_user(authorization: str = Header(default=""), db: Session = Depends(get_db)) -> User:
    parts = authorization.removeprefix("Bearer ").split(".")
    meta = None
    try:
        if len(parts) == 3:
            uid, exp, sig = parts
            raw_prefix = f"{uid}.{exp}"
        elif len(parts) == 4:
            uid, exp, payload_b64, sig = parts
            raw_prefix = f"{uid}.{exp}.{payload_b64}"
            padded = payload_b64 + "=" * (-len(payload_b64) % 4)
            meta = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
        else:
            raise ValueError
        good = hmac.new(SECRET.encode(), raw_prefix.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, good) or int(exp) < time.time():
            raise ValueError
    except Exception:
        raise HTTPException(401, "Invalid or missing token")

    u = db.get(User, int(uid))
    if meta and os.getenv("VERCEL") and not os.getenv("DATABASE_URL"):
        meta_email = str(meta.get("em") or "").strip().lower()
        if not u or (meta_email and u.email.lower() != meta_email):
            u = _hydrate_ephemeral_vercel_user(db, int(uid), meta)
    if not u:
        raise HTTPException(401, "Unknown user")
    return u


def owner_only(u: User = Depends(current_user)) -> User:
    if u.role != "owner":
        raise HTTPException(403, "Owner role required")
    return u
