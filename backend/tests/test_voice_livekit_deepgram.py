import base64
import time
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import Clinic, User, ClinicRule
from app.security import hash_pw
from app.integrations import livekit as lk, deepgram as dg

cl = TestClient(app)

VOICE_TEST_EMAIL = "voicetest_owner@clinic.com"
VOICE_TEST_PASS = "clinic1234"
_clinic_id = None
_headers = None


def setup_module():
    global _clinic_id, _headers
    db = SessionLocal()
    c = db.query(Clinic).filter_by(name="Voice Telemetry Clinic").first()
    if not c:
        c = Clinic(
            name="Voice Telemetry Clinic",
            address="42 Audio Avenue, Pune",
            hours="Mon-Sun 8 AM - 8 PM",
            fees="Rs 200",
            staff_phone="+919876543210",
        )
        db.add(c)
        db.commit()
    _clinic_id = c.id

    u = db.query(User).filter_by(email=VOICE_TEST_EMAIL).first()
    if not u:
        u = User(
            email=VOICE_TEST_EMAIL,
            password_hash=hash_pw(VOICE_TEST_PASS),
            clinic_id=_clinic_id,
            role="owner",
        )
        db.add(u)
        db.commit()
    db.close()

    res = cl.post("/auth/login", json={"email": VOICE_TEST_EMAIL, "password": VOICE_TEST_PASS})
    assert res.status_code == 200, res.text
    token = res.json()["token"]
    _headers = {"Authorization": f"Bearer {token}"}


def test_1_livekit_token_generation():
    """Verify LiveKit WebRTC JWT token generation with room and identity."""
    res = cl.post("/voice/livekit/token", json={
        "clinic_id": _clinic_id,
        "room": "room-voice-alpha",
        "identity": "caller-007",
        "name": "Arjun Sharma",
    })
    assert res.status_code == 200, res.text
    d = res.json()
    assert d.get("token") is not None
    assert d.get("room") == "room-voice-alpha"
    assert d.get("participant_identity") == "caller-007"
    assert "url" in d
    # Token must have standard JWT 3-segment format (header.payload.signature)
    parts = d["token"].split(".")
    assert len(parts) == 3


def test_2_livekit_token_verification():
    """Verify LiveKit RFC 7519 token verification and webhook parsing."""
    tok_info = lk.create_livekit_token(
        clinic_id=_clinic_id,
        room_name="room-audit",
        participant_identity="participant-1",
        api_key="test-key",
        api_secret="test-secret",
    )
    token = tok_info["token"]
    # Valid secret verification
    verified = lk.verify_livekit_token(token, api_secret="test-secret")
    assert verified is not None
    assert verified.get("sub") == "participant-1"
    assert verified.get("video", {}).get("room") == "room-audit"

    # Invalid secret verification fails gracefully
    invalid = lk.verify_livekit_token(token, api_secret="wrong-secret")
    assert invalid is None

    # Test webhook endpoint with auth header
    res = cl.post(
        "/voice/livekit/webhook",
        headers={"Authorization": f"Bearer {token}"},
        json={"event": "participant_joined", "room": {"name": "room-audit"}},
    )
    assert res.status_code == 200
    assert res.json().get("status") == "received"


def test_3_deepgram_transcribe_base64():
    """Verify Deepgram Nova-2 STT endpoint with base64 audio payload."""
    dummy_wav_header = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    b64 = base64.b64encode(dummy_wav_header).decode("utf-8")

    res = cl.post("/voice/deepgram/transcribe", json={
        "audio_base64": b64,
        "content_type": "audio/wav",
        "language": "hi",
    })
    assert res.status_code == 200, res.text
    d = res.json()
    assert "transcript" in d
    assert "confidence" in d
    assert "latency_ms" in d
    assert d.get("model") == "nova-2"


def test_4_deepgram_multilingual_language_codes():
    """Verify Deepgram handles Hindi, Marathi, and English language options."""
    for lang in ["hi", "mr", "en-IN"]:
        res = cl.post("/voice/deepgram/transcribe", json={
            "audio_base64": base64.b64encode(b"empty").decode("utf-8"),
            "language": lang,
        })
        assert res.status_code == 200
        assert res.json().get("language") == lang


def test_5_voice_status_telemetry():
    """Verify telemetry status reflects Twilio, LiveKit, and Deepgram configurations."""
    res = cl.get(f"/voice/status?clinic_id={_clinic_id}")
    assert res.status_code == 200
    d = res.json()
    assert "twilio" in d
    assert "livekit" in d
    assert "deepgram" in d
    assert d["livekit"]["agent_protocol"] == "webrtc_audio"
    assert d["deepgram"]["model"] == "nova-2"


def test_6_voice_byok_config_crud():
    """Verify clinic owner can retrieve and update BYOK LiveKit and Deepgram keys."""
    # 1. Update config
    update_res = cl.put(
        "/voice/config",
        headers=_headers,
        json={
            "livekit_url": "wss://test-project.livekit.cloud",
            "livekit_api_key": "API_KEY_TEST_12345",
            "livekit_api_secret": "API_SECRET_TEST_98765",
            "deepgram_api_key": "DEEPGRAM_TEST_KEY_45678",
            "deepgram_model": "nova-2",
        },
    )
    assert update_res.status_code == 200, update_res.text
    assert update_res.json().get("ok") is True

    # 2. Get config (keys should be masked)
    get_res = cl.get("/voice/config", headers=_headers)
    assert get_res.status_code == 200
    cfg = get_res.json()
    assert cfg.get("livekit_url") == "wss://test-project.livekit.cloud"
    assert cfg.get("livekit_configured") is True
    assert cfg.get("deepgram_configured") is True
    assert "..." in cfg.get("livekit_api_key_masked", "")


def test_7_voice_diagnostic_test_endpoint():
    """Verify POST /voice/test executes diagnostics on LiveKit and Deepgram."""
    res = cl.post(
        "/voice/test",
        headers=_headers,
        json={
            "livekit_url": "wss://test-project.livekit.cloud",
            "livekit_api_key": "API_TEST",
            "livekit_api_secret": "SECRET_TEST",
        },
    )
    assert res.status_code == 200, res.text
    d = res.json()
    assert d.get("ok") is True
    assert d["livekit"]["status"] == "ready"
    assert d["livekit"]["token_valid"] is True
    assert "latency_ms" in d["livekit"]
    assert d["deepgram"]["status"] in ("ready", "needs_key")
