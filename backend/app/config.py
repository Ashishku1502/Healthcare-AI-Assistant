import os
SECRET = os.getenv("APP_SECRET", "dev-only-change-me")
DB_URL = os.getenv("DATABASE_URL", "sqlite:///./parchi.db")
if DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)
if "neon.tech" in DB_URL and "sslmode" not in DB_URL:
    delimiter = "&" if "?" in DB_URL else "?"
    DB_URL = f"{DB_URL}{delimiter}sslmode=require"
WA_SECRET = os.getenv("WHATSAPP_APP_SECRET", "dev-wa-secret")
RAW_ORIGIN = os.getenv("FRONTEND_ORIGIN", "").strip()
ORIGIN = RAW_ORIGIN.rstrip("/") if RAW_ORIGIN else "http://localhost:3000"
VOICE_SECRET = os.getenv("VOICE_WEBHOOK_SECRET", "dev-voice-secret")
RETENTION_DAYS = int(os.getenv("RETENTION_DAYS", "90"))
LOGIN_RATE = int(os.getenv("LOGIN_RATE_PER_MIN", "10"))
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
LLM_DAILY_CAP = int(os.getenv("LLM_DAILY_CAP", "50"))
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "dev-twilio-auth-token")
VOICE_MONTHLY_MINUTE_CAP = int(os.getenv("VOICE_MONTHLY_MINUTE_CAP", "300"))
