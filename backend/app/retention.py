from datetime import timedelta
from sqlalchemy.orm import Session
from .config import RETENTION_DAYS
from .models import Event, Audit, now
def purge_old(db: Session, clinic_id: int, days: int = RETENTION_DAYS) -> dict:
    cut = now() - timedelta(days=days)
    e = db.query(Event).filter(Event.clinic_id == clinic_id, Event.created_at < cut).delete()
    db.add(Audit(clinic_id=clinic_id, actor="retention", action=f"purged {e} events older than {days}d")); db.commit()
    return {"events_deleted": e, "retention_days": days, "cutoff": cut.isoformat()}
