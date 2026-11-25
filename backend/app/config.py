import os
SECRET = os.getenv("APP_SECRET", "dev-only-change-me")
DB_URL = os.getenv("DATABASE_URL", "sqlite:///./parchi.db")
WA_SECRET = os.getenv("WHATSAPP_APP_SECRET", "dev-wa-secret")
ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
VOICE_SECRET = os.getenv("VOICE_WEBHOOK_SECRET", "dev-voice-secret")
RETENTION_DAYS = int(os.getenv("RETENTION_DAYS", "365"))
LOGIN_RATE = int(os.getenv("LOGIN_RATE_PER_MIN", "10"))
