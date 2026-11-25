# Parchi AI — AI front desk for small clinics (MVP)
Next.js + FastAPI + SQLAlchemy. Admin dashboard, safe rule-based receptionist (Hindi/Hinglish/English), server-enforced booking, WhatsApp webhook, analytics.

## Run locally
```bash
# backend
cd backend && pip install -r requirements.txt && python seed.py
uvicorn app.main:app --reload          # http://localhost:8000/docs
pytest -q                               # 11 tests
# frontend (new terminal)
cd frontend && cp .env.example .env.local && npm install && npm run dev   # http://localhost:3000
```
Login (seeded): `owner@clinic.com` / `clinic1234`

## Docker
`cp .env.example .env` (edit secrets) → `docker compose up --build`. Then `docker compose exec api python seed.py`.

## WhatsApp webhook test
`POST /webhooks/whatsapp/{clinic_id}` body `{"message_id","from","text"}`, header `X-Signature` = HMAC-SHA256(body, WHATSAPP_APP_SECRET) hex. Adapt the payload/signature to your provider (Meta/Twilio) in `app/routes/whatsapp.py`.

## Status (honest) — 26 backend tests pass; `next build` passes
| Area | Status |
|---|---|
| Auth, roles, tenant isolation, audit, rate limit (login 10/min, webhooks 120/min; in-memory, single process) | Implemented, tested |
| Booking: confirmation + DB unique index | Implemented; tested sequentially AND with 6 concurrent threads (exactly 1 wins, SQLite) |
| Receptionist engine (rule-based, not an LLM): AI disclosure, urgent override, no medical advice, no report disclosure, relay, sales rep, safe-contact, wider Hinglish red flags | Implemented, tested on calls 2-7 |
| Wait answers from live status; receptionist can set it by dashboard buttons OR by texting ARRIVED / LATE 30 / OUT to the WhatsApp number from `staff_phone` | Implemented, tested |
| Voice webhook `/webhooks/voice/{clinic}` (signed): speech turn in, text-to-speak + transfer number out; unclear x2 -> human transfer | Implemented, tested with simulated provider payloads. **No real telephony/STT/TTS provider connected** |
| Reminders: send-once, skips opted-out/safe-contact; `POST /reminders/run` for cron | Implemented, tested; LogSender only (no real WhatsApp sender) |
| Retention purge `POST /admin/purge` (RETENTION_DAYS, default 365) | Implemented, tested (events only) |
| Call Simulator tab, receptionist Now tab | Implemented; not browser-tested |
| Marathi | Detection + safety replies only |
| NOT done: real provider adapters, Alembic migrations, walk-in token tracking, owner rules page, Redis rate limit, real-audio tests, LLM layer | NOT implemented |

## Before real patient data
Use HTTPS, strong secrets, Postgres + migrations, rate limiting, retention policy, provider webhook verification, and a security review. Tokens are a simple HMAC scheme; replace with a vetted auth library for production.
