from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import ORIGIN
from .database import Base, engine
from .routes import api, whatsapp, voice
import time
from .config import LOGIN_RATE
from collections import defaultdict
from fastapi import Request
from fastapi.responses import JSONResponse
Base.metadata.create_all(engine)
app = FastAPI(title="Parchi AI API")
origins = list({ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"})
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
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
