import hashlib, hmac, os, time, base64
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from .config import SECRET
from .database import get_db
from .models import User
def hash_pw(pw: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    return base64.b64encode(salt).decode() + "$" + hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 120_000).hex()
def verify_pw(pw: str, stored: str) -> bool:
    s, _ = stored.split("$"); return hmac.compare_digest(hash_pw(pw, base64.b64decode(s)), stored)
def make_token(uid: int, ttl=8*3600) -> str:
    p = f"{uid}.{int(time.time())+ttl}"
    return p + "." + hmac.new(SECRET.encode(), p.encode(), hashlib.sha256).hexdigest()
def current_user(authorization: str = Header(default=""), db: Session = Depends(get_db)) -> User:
    try:
        uid, exp, sig = authorization.removeprefix("Bearer ").split(".")
        good = hmac.new(SECRET.encode(), f"{uid}.{exp}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, good) or int(exp) < time.time(): raise ValueError
    except Exception:
        raise HTTPException(401, "Invalid or missing token")
    u = db.get(User, int(uid))
    if not u: raise HTTPException(401, "Unknown user")
    return u
def owner_only(u: User = Depends(current_user)) -> User:
    if u.role != "owner": raise HTTPException(403, "Owner role required")
    return u
