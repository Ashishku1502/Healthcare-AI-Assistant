# Parchi AI — Automated Clinic Front Desk & Voice Agent

[![Pytest Suite](https://img.shields.io/badge/pytest-107%20passed%20(100%25)-success)](https://github.com/Ashishku1502/Healthcare-AI-Assistant)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict%20clean-blue)](https://github.com/Ashishku1502/Healthcare-AI-Assistant)
[![Frontend](https://img.shields.io/badge/Vercel-Frontend%20Live-black)](https://frontend-bice-eight-7xnlf654ep.vercel.app)
[![Backend API](https://img.shields.io/badge/Vercel-API%20Live-009688)](https://parchi-api.vercel.app)
[![WCAG](https://img.shields.io/badge/WCAG%202.1-AAA%20Contrast-green)](https://frontend-bice-eight-7xnlf654ep.vercel.app)

**Parchi AI** is an intelligent, automated front desk companion and telephony voice engine engineered for small clinics, outpatient departments (OPDs), and healthcare practices across India. 

It handles repetitive patient phone calls and WhatsApp questions (doctor delays, queue tokens, consultation fees, UPI payment modes, clinic hours, and directions) with sub-second response times, enforces truthful wait times synced to live receptionist taps, routes acute emergencies directly to **112**, and coordinates human staff handoffs.

---

## Live Deployments & Demo Access

| Service | URL | Notes |
|---|---|---|
| **Frontend Web App** | [https://frontend-bice-eight-7xnlf654ep.vercel.app](https://frontend-bice-eight-7xnlf654ep.vercel.app) | Landing page, Hero interactive demo, Clinic Dashboard, and Reception Desk. |
| **Backend API** | [https://parchi-api.vercel.app](https://parchi-api.vercel.app) | FastAPI backend with persistent HTTP connection pooling and LRU intent caching. |
| **Swagger API Docs** | [https://parchi-api.vercel.app/docs](https://parchi-api.vercel.app/docs) | Interactive OpenAPI documentation. |
| **GitHub Repository** | [https://github.com/Ashishku1502/Healthcare-AI-Assistant](https://github.com/Ashishku1502/Healthcare-AI-Assistant) | Main branch source code. |

### Demo Credentials (Seeded Accounts)
- **Clinic Owner Account**: `owner@clinic.com` / `clinic1234` (Full access to Now, Doctors, Appointments, Overview, AI Receptionist, Voice Agent Simulator, and Settings).
- **Reception Desk Account**: `desk@clinic.com` / `clinic1234` (Staff view for live status toggles and token queue management).

---

## Codebase Knowledge Graph & System Architecture

### 1. End-to-End System Topology

```mermaid
flowchart TB
    subgraph Clients["Patient & Staff Clients"]
        direction TB
        PW["Public Website Visitors"]
        TC["Twilio Voice Callers (Telephony)"]
        WA["WhatsApp Chat Patients"]
        RD["Reception Desk Staff (Mobile Web)"]
        CO["Clinic Owner / Doctor (Dashboard)"]
    end

    subgraph Edge["Vercel Edge & Ingress Layer"]
        VFE["Next.js 14 Frontend<br/>(frontend-bice-eight-7xnlf654ep.vercel.app)"]
        VBE["FastAPI Serverless Backend<br/>(parchi-api.vercel.app)"]
    end

    subgraph CoreEngine["Backend Core Processing Pipeline"]
        direction TB
        Auth["Security & JWT Auth<br/>(security.py)"]
        Safety["Deterministic Safety Gate<br/>(safety.py)"]
        Dialogue["Receptionist Dialogue Manager<br/>(receptionist.py)"]
        Booking["Concurrency Booking Guard<br/>(booking.py)"]
        LLM["Multi-Provider LLM Engine<br/>(llm.py)"]
        TwilioAdapter["Twilio Telephony Adapter<br/>(integrations/twilio.py)"]
        Retention["DPDP 90-Day Retention Purge<br/>(retention.py)"]
    end

    subgraph DataStore["Persistence & State Layer"]
        DB[("SQLite / PostgreSQL DB<br/>SQLAlchemy ORM")]
        IntentCache[("LRU Intent Cache<br/>(512 slots)")]
    end

    subgraph ExternalServices["External AI & Telephony Providers"]
        Gemini["Google Gemini 1.5 Flash"]
        OpenAI["OpenAI GPT-4o-mini"]
        Groq["Groq Llama-3.3-70b"]
        OpenRouter["OpenRouter Meta Llama 3.3"]
        TwilioAPI["Twilio Voice / Webhook Network"]
        LiveKitCloud["LiveKit WebRTC Audio Cloud (Sub-100ms)"]
        DeepgramNova2["Deepgram Nova-2 Speech-to-Text (Multilingual)"]
        Emergency112["National Emergency Services (112)"]
    end

    PW -->|HTTPS| VFE
    RD -->|HTTPS / Mobile View| VFE
    CO -->|HTTPS / Dashboard View| VFE
    VFE -->|REST API / JSON| VBE
    TC -->|HMAC-SHA1 Voice Webhook| VBE
    WA -->|HMAC-SHA256 WhatsApp Webhook| VBE

    VBE --> Auth
    VBE --> Safety
    Safety -->|Red Flag Acute Symptom| Emergency112
    Safety -->|Safe / Administrative Query| Dialogue
    Dialogue -->|Slot Reservation| Booking
    Dialogue -->|Intent Classification & Semantic Fallback| LLM
    LLM --> IntentCache
    LLM -->|BYOK REST Client| Gemini
    LLM -->|BYOK REST Client| OpenAI
    LLM -->|BYOK REST Client| Groq
    LLM -->|BYOK REST Client| OpenRouter
    VBE --> TwilioAdapter
    TwilioAdapter --> TwilioAPI

    Booking --> DB
    Dialogue --> DB
    Retention --> DB
    Auth --> DB
```

---

### 2. Frontend Component & Navigation Graph

The Next.js 14 App Router orchestrates public visitors, reception desk staff, and clinic administrators with zero layout shift and sub-second client-side hydration:

```mermaid
graph TD
    RootLayout["Root Layout (layout.tsx)<br/>• Mukta & Bricolage Fonts<br/>• Global Theme Provider"]
    GlobalChatbot["AiChatbot (ai-chatbot.tsx)<br/>• Web Speech STT & TTS<br/>• 112 Triage Call Button<br/>• Staff Dial Link"]
    
    RootLayout --> GlobalChatbot
    RootLayout --> LandingPage["Landing Page (page.tsx)"]
    RootLayout --> DashboardPage["Dashboard (dashboard/page.tsx)"]
    RootLayout --> ReceptionistPage["Receptionist Desk (receptionist/page.tsx)"]
    RootLayout --> AuthPages["Auth & Register (login/auth-form.tsx)"]

    LandingPage --> HeroDemo["HeroDemo (hero-demo.tsx)"]
    LandingPage --> ThemeToggle["ThemeToggle (theme-toggle.tsx)"]
    LandingPage --> ClinicGraphics["ClinicHeroScene (graphics.tsx)"]

    HeroDemo --> ApiClient["API Client (lib/api.ts)"]
    GlobalChatbot --> ApiClient
    DashboardPage --> ApiClient
    ReceptionistPage --> ApiClient
    AuthPages --> ApiClient

    subgraph DashboardTabs["Clinic Owner Command Center (7 Tabs)"]
        direction TB
        NowTab["Now (Live Status & Handoffs)"]
        OverviewTab["Overview (Activity & Safety Log)"]
        DoctorsTab["Doctors (Roster & Schedules)"]
        AppointmentsTab["Appointments (Slot Management)"]
        AiTab["AI Receptionist (Diagnostic Console)"]
        SimTab["Call Simulator (Voice Telephony & 9 Presets)"]
        SettingsTab["Settings (LLM BYOK & DPDP Purge)"]
    end

    DashboardPage --> DashboardTabs
```

---

### 3. Backend Module Hierarchy & Dependency Map

```mermaid
graph LR
    subgraph Ingress["FastAPI Entrypoints"]
        Main["main.py<br/>App Factory & CORS"]
        ApiRoute["routes/api.py<br/>REST CRUD & Chat"]
        VoiceRoute["routes/voice.py<br/>Twilio & Voice Hooks"]
        WARoute["routes/whatsapp.py<br/>WhatsApp Hooks"]
    end

    subgraph CoreEngines["Core Logic Engines"]
        Receptionist["receptionist.py<br/>Dialogue Manager"]
        Safety["safety.py<br/>Deterministic Safety"]
        LLM["llm.py<br/>Multi-Provider LLM"]
        Booking["booking.py<br/>Slot Concurrency"]
        Security["security.py<br/>JWT & Passwords"]
        Retention["retention.py<br/>DPDP 90-Day Purge"]
        TwilioInt["integrations/twilio.py<br/>Signature & Audio Caching"]
    end

    subgraph Infrastructure["Config & Persistence"]
        Config["config.py<br/>Environment Vars"]
        Database["database.py<br/>Engine & Session"]
        Models["models.py<br/>SQLAlchemy ORM"]
        Schemas["schemas.py<br/>Pydantic Models"]
    end

    Main --> ApiRoute
    Main --> VoiceRoute
    Main --> WARoute

    ApiRoute --> Receptionist
    ApiRoute --> Security
    ApiRoute --> Booking
    ApiRoute --> Retention
    ApiRoute --> LLM

    VoiceRoute --> Receptionist
    VoiceRoute --> TwilioInt
    WARoute --> Receptionist

    Receptionist --> Safety
    Receptionist --> LLM
    Receptionist --> Booking

    Booking --> Models
    Receptionist --> Models
    Safety --> Models
    Security --> Models
    LLM --> Models

    Models --> Database
    Database --> Config
```

---

### 4. Database Architecture (Entity-Relationship Diagram)

```mermaid
erDiagram
    CLINICS ||--o{ USERS : "has staff"
    CLINICS ||--o{ DOCTORS : "employs"
    CLINICS ||--o{ PATIENTS : "registers"
    CLINICS ||--o{ APPOINTMENTS : "schedules"
    CLINICS ||--o{ CHAT_SESSIONS : "conducts"
    CLINICS ||--o{ EVENTS : "records"
    CLINICS ||--o{ CLINIC_RULES : "configures"
    CLINICS ||--o{ SAFETY_TRIGGER_LOGS : "audits"

    DOCTORS ||--o{ APPOINTMENTS : "consults"
    PATIENTS ||--o{ APPOINTMENTS : "attends"

    CLINICS {
        int id PK
        string name
        string address
        string hours
        string fees
        string staff_phone
        string consent_line
        int retention_days
        boolean is_demo
    }

    USERS {
        int id PK
        int clinic_id FK
        string email UK
        string password_hash
        string role "owner | receptionist"
    }

    DOCTORS {
        int id PK
        int clinic_id FK
        string name
        string speciality
        string days "0,1,2,3,4,5"
        int start_hour
        int end_hour
        int slot_minutes
        string status_state "in | late | out | unknown"
        int late_minutes
        int current_token
        datetime status_at
        boolean active
    }

    PATIENTS {
        int id PK
        int clinic_id FK
        string name
        string phone
        boolean consent
        boolean opted_out
        boolean no_message
    }

    APPOINTMENTS {
        int id PK
        int clinic_id FK
        int doctor_id FK
        int patient_id FK
        datetime start
        string status "booked | cancelled"
        string channel "web | voice | whatsapp"
        boolean reminded
    }

    CHAT_SESSIONS {
        int id PK
        int clinic_id FK
        string channel
        string external_id
        json pending
        int event_id
    }

    EVENTS {
        int id PK
        int clinic_id FK
        string channel
        string intent "hours | wait | fees | address | other"
        string outcome "answered | booked | handoff | urgent"
        string note
        boolean resolved
        datetime created_at
    }

    CLINIC_RULES {
        int id PK
        int clinic_id FK
        string rule_key "llm_provider | llm_api_key | llm_model"
        string rule_value
        int version
        boolean active
        string created_by
        datetime created_at
    }

    SAFETY_TRIGGER_LOGS {
        int id PK
        int clinic_id FK
        string channel
        string session_id
        string category "urgent | medical"
        string trigger_rule
        string message_excerpt
        boolean staff_alerted
        boolean ai_skipped
        datetime created_at
    }

    AUDIT {
        int id PK
        int clinic_id
        string actor
        string action
        datetime created_at
    }

    WEBHOOK_LOG {
        string message_id PK
    }
```

---

### 5. AI, Safety Triage & Receptionist-Grounding Pipeline

```mermaid
flowchart TD
    UserQuery["Incoming User Query<br/>(Text or Spoken Audio)"]
    
    subgraph TriageGate["Stage 1: Pre-Model Safety Triage (Deterministic)"]
        SafetyRegex{"Contains Red-Flag Symptom?<br/>• Chest pain / Breathlessness<br/>• Seizure / Unconsciousness<br/>• Child under 5 with fever"}
        SafetyLog["Log to safety_trigger_logs<br/>& Alert Staff (Needs Attention)"]
        Return112["Return Emergency Action Plan<br/>• Call 112 Direct Dial<br/>• Nearest Emergency Room"]
    end

    subgraph GroundingEngine["Stage 2: Receptionist-Grounded Context Assembly"]
        FetchClinic["Fetch Clinic Record<br/>(Hours, Fees, Address, Phone)"]
        FetchDoctor["Fetch Live Doctor Record<br/>(status_state, late_minutes, current_token, status_at)"]
        Freshness{"Status fresh?<br/>(Updated < 30 min ago)"}
        Unsure["State: 'Status is unconfirmed.<br/>The clinic has not confirmed the timing yet.'"]
        Verified["State: Verified 'Doctor In' / 'X min late' / 'Token #N'"]
    end

    subgraph LLMOrFallback["Stage 3: Hybrid LLM Classifier & Fast Fallback"]
        CheckCache{"Exists in<br/>_INTENT_CACHE?"}
        UseCache["Return Cached Intent & Reply<br/>(Latency: < 2ms)"]
        CheckKey{"Clinic LLM Key<br/>Configured?"}
        CallLLM["Call Configured Provider<br/>(Gemini / OpenAI / Groq / OpenRouter)<br/>with System Guardrails"]
        FastRegexFallback["Built-in Multilingual Classifier<br/>(Hindi, Hinglish, Marathi, English)<br/>Zero Latency & Zero Cost"]
    end

    subgraph ChannelOutput["Stage 4: Channel Specific Output Formatting"]
        FormatVoice{"Channel == 'voice'?"}
        VoiceConstraint["Enforce Telephony Constraints:<br/>• Strictly < 2 sentences<br/>• Strip markdown/asterisks<br/>• No button/IVR prompts"]
        FormatChat["Enforce Chat Constraints:<br/>• Clear paragraph breaks<br/>• Dynamic action buttons (tel:112, Call Staff)"]
    end

    UserQuery --> SafetyRegex
    SafetyRegex -->|YES| SafetyLog --> Return112
    SafetyRegex -->|NO| FetchClinic --> FetchDoctor --> Freshness
    Freshness -->|NO| Unsure --> CheckCache
    Freshness -->|YES| Verified --> CheckCache
    
    CheckCache -->|HIT| UseCache --> FormatVoice
    CheckCache -->|MISS| CheckKey
    CheckKey -->|YES| CallLLM --> FormatVoice
    CheckKey -->|NO or Timeout| FastRegexFallback --> FormatVoice

    FormatVoice -->|YES| VoiceConstraint
    FormatVoice -->|NO| FormatChat
```

---

### 6. Agent Execution Workflows (Sequence Diagrams)

#### A. Emergency Trigger & 112 Routing
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Caller / Visitor
    participant Hook as API / Voice Hook
    participant Safety as safety.py (Safety Gate)
    participant DB as Database
    participant Staff as Staff Attention Queue

    Patient->>Hook: "Follow-up chahiye, subah se seene mein dard aur saans lene mein dikkat ho rahi hai"
    Hook->>Safety: pre_model_safety_check(message)
    Note over Safety: Matches chest_pain & breathlessness regex
    Safety->>DB: INSERT INTO safety_trigger_logs (category='urgent', trigger_rule='chest_pain')
    Safety->>DB: INSERT INTO events (outcome='urgent', intent='emergency')
    Safety-->>Hook: SafetyCheckResult(action='emergency', alert_staff=True, transfer_to='112')
    Hook->>Staff: Flag high-priority urgent callback in /attention
    Hook-->>Patient: "🚨 Emergency detected. Please call 112 immediately. Directing call to 112."
```

#### B. Voice Telephony Turn with Latency SLA Filler
```mermaid
sequenceDiagram
    autonumber
    actor Caller as Phone Caller
    participant Twilio as Twilio Telecom Gateway
    participant Webhook as /webhooks/voice/twilio/{id}
    participant Adapter as twilio.py (Adapter)
    participant Receptionist as receptionist.py
    participant LLM as Multi-Provider LLM

    Caller->>Twilio: Spoken audio: "Doctor sahab aa gaye kya?"
    Twilio->>Webhook: POST with X-Twilio-Signature
    Webhook->>Adapter: verify_twilio_signature()
    Note over Adapter: Validates HMAC-SHA1
    Adapter->>Receptionist: Process speech turn
    alt Latency > 1.5 seconds
        Adapter-->>Twilio: Play filler audio: "Ek second, main dekh rahi hoon"
    end
    Receptionist->>LLM: Classify intent with live doctor state
    LLM-->>Receptionist: "Dr. Neha Sharma is on duty. Current token is #14."
    Receptionist-->>Adapter: Clean text (< 2 sentences, no asterisks)
    Adapter-->>Twilio: TwiML <Say voice="Polly.Aditi">Dr. Neha Sharma is on duty...</Say>
    Twilio-->>Caller: Speaks reply in natural voice
```

---

## Key Capabilities & Core Architectural Principles

### 1. Truthful Wait Times & Token Queuing
- **Zero Hallucination**: Parchi never fabricates or guesses doctor delays. It communicates only what the receptionist has tapped in the live system (`Doctor In`, `Running Late +X min`, `Not In Today`).
- **Token Gap Telemetry**: If a patient asks about their token (e.g., *"token 18"*), Parchi calculates the exact queue gap from the doctor's active token and calculates estimated wait time.
- **Unconfirmed Status Safety**: If doctor status has not been confirmed recently, Parchi honestly admits: *"The clinic has not confirmed the timing yet."*

### 2. Pre-Model 112 Emergency Safety Gate
- **Deterministic Pre-Model Safety Filter**: Executes on **every single message** before any AI/LLM model invocation or booking flow.
- **Immediate Emergency Override**: If acute red flags appear (chest pain, breathlessness, seizure, heavy bleeding, unconsciousness, or child under 5 with fever):
  - Completely bypasses LLM text generation.
  - Returns a hardcoded emergency instruction directing the caller to the nearest ER or to call **112**.
  - Generates an immediate high-priority staff alert in the **Needs Attention** queue.
  - Automatically routes call transfer to **112**.

### 3. Voice Agent & Telephony Engine (LiveKit WebRTC + Deepgram Nova-2 + Twilio)
- **LiveKit WebRTC Audio Rooms**: Real-time bidirectional WebRTC audio agent room management. Backend mints standard RFC 7519 HMAC-SHA256 JWT tokens with grant permissions (`roomJoin`, `canPublish`, `canSubscribe`, `canPublishData`) with zero heavy C-dependencies, ensuring full compatibility on Vercel Amazon Linux serverless containers.
- **Deepgram Nova-2 Speech-to-Text (STT)**: High-speed, high-accuracy speech transcription supporting **Hindi (`hi`)**, **Marathi (`mr`)**, and **Indian English (`en-IN`)** with smart punctuation, word timings, and confidence scores in sub-100ms.
- **Telephony Constraints**: Spoken replies are strictly concise (< 2 sentences) and clean of markdown, asterisks, bullet points, and parentheticals.
- **Zero Button Prompts**: Telephony voice turns never ask callers to press keys or navigate IVR phone trees.
- **Conversational Latency SLA**: Sub-second execution (400ms – 900ms). Automatically triggers filler audio (*"Ek second, main dekh rahi hoon"*) if latency exceeds 1.5 seconds.
- **Unclear Turn Handling**: Turn 1 asks a simple Yes/No question; Turn 2 immediately initiates human staff transfer without repetitive menus.
- **Provider Adapters**: Real Twilio HMAC-SHA1 signature verification, pre-generated audio caching for templated facts, and per-clinic monthly minute limits.
- **Multi-Tenant BYOK**: Clinic owners can supply their own LiveKit (`livekit_url`, `livekit_api_key`, `livekit_api_secret`) and Deepgram (`deepgram_api_key`) credentials directly from the Settings tab, complete with live diagnostic latency checks.

### 4. Multi-Provider LLM Integration
- **BYOK (Bring Your Own Key)**: Configurable directly from the Dashboard Settings tab with live diagnostic testing:
  - **Google Gemini** (`gemini-1.5-flash`)
  - **OpenAI** (`gpt-4o-mini`)
  - **Groq** (`llama-3.3-70b-versatile`)
  - **OpenRouter** (`meta-llama/llama-3.3-70b-instruct`)
  - **Custom Base URL** (Ollama, vLLM, Azure OpenAI)
- **Zero-Latency Fallback**: Seamless, high-speed built-in multilingual NLU classifier when external API keys are not supplied or experiencing timeouts.

### 5. Multi-Language Support
- Fluent conversational support in **English**, **Hindi**, **Hinglish**, and **Marathi** across both text chat and speech synthesis.

---

## 9 Voice Agent Test Call Scenarios (Built into Simulator)

Inside the Dashboard (`/dashboard`) under the **Voice Agent & Call Simulator** tab, 9 pre-configured test call presets allow instant verification of all voice capabilities:

1. `Call 1 · Doctor wait & token`: *"Doctor sahab aa gaye kya? Kitna wait hai?"*
2. `Call 2 · Fees & UPI Payment`: *"Consultation fees kitni hai aur UPI payment chalega?"*
3. `Call 3 · Address & Landmark`: *"Clinic kahan par hai aur landmark kya hai?"*
4. `Call 4 · Clinic Timings`: *"Clinic kab tak khula rehta hai?"*
5. `Call 5 · Services & Checkups`: *"Clinic me kya kya checkup aur facilities available hain?"*
6. `Call 6 · Walk-in vs Booking`: *"Kya bina appointment seedhe aa sakte hain?"*
7. `Call 7 · Marathi (वेळ & डॉक्टर)`: *"आज क्लिनिकची वेळ काय आहे आणि डॉक्टर कधी भेटतील?"*
8. `Call 8 · 112 Chest Pain`: *"Follow-up chahiye, subah se seene mein dard aur saans lene mein dikkat ho rahi hai"* (Triggers 112 Emergency Route)
9. `Call 9 · Staff Handoff`: *"Main Verma bol raha hoon, Dr. Neha se baat karni hai report ke liye"* (Triggers Staff Callback Transfer)

---

## API Endpoint Reference

### Authentication & Tenant Operations
- `POST /auth/login` — Authenticate clinic owner or staff, returns JWT token.
- `POST /auth/signup` — Register a new clinic with default doctor and settings.
- `GET /auth/me` — Retrieve current authenticated session identity and clinic details.

### AI Receptionist & Chat
- `POST /chat` — Authenticated chat turn with intent classification, outcome, and telemetry.
- `POST /chat/public` — Public website visitor chat turn (no authentication required).
- `POST /chat/unclear` — Telephony fallback for degraded audio or speech recognition misses.

### Doctor & Queue Management
- `GET /doctors` — List all active doctors for the clinic.
- `PUT /doctors/{id}/status` — Update doctor status (`in`, `late`, `out`) with late minutes.
- `POST /doctors/{id}/next-token` — Advance active patient token queue counter.

### Staff Attention & Callbacks
- `GET /attention` — List pending callbacks and urgent handoffs.
- `POST /attention` — Log a new callback or reception note manually.
- `POST /attention/{id}/resolve` — Mark a callback or handoff as resolved.

### Multi-Provider LLM Configuration
- `GET /llm/config` — Get active provider, model name, masked API key, and preset choices.
- `PUT /llm/config` / `POST /llm/config` — Update clinic LLM provider, model, and credentials.
- `POST /llm/test` — Perform live diagnostic latency ping to LLM endpoint.
- `GET /llm/status` — Get daily cap utilization and fast-cache diagnostics.

### Voice Agent, Telephony & STT Endpoints
- `POST /voice/livekit/token` — Generates standard RFC 7519 HMAC-SHA256 LiveKit AccessToken for WebRTC Voice Agent rooms.
- `POST /voice/livekit/webhook` — Receives and verifies LiveKit server room events (participant joined, audio stream status).
- `POST /voice/deepgram/transcribe` — Transcribes raw or base64 audio buffers via Deepgram Nova-2 STT with multilingual support.
- `GET /voice/status` — Returns end-to-end telemetry and configuration status for LiveKit, Deepgram, and Twilio.
- `GET /voice/config` — Retrieves clinic-specific BYOK credentials (masked) for LiveKit and Deepgram.
- `PUT /voice/config` / `POST /voice/config` — Updates clinic BYOK rules for LiveKit and Deepgram.
- `POST /voice/test` — Runs live diagnostic test for LiveKit token minting and Deepgram connectivity.
- `POST /webhooks/voice/{clinic_id}` — Internal HMAC-SHA256 signed telephony webhook.
- `POST /webhooks/voice/twilio/{clinic_id}` — Twilio voice turn webhook with HMAC-SHA1 validation.
- `POST /webhooks/voice/twilio/{clinic_id}/status` — Twilio call duration & minute tracker.
- `POST /webhooks/whatsapp/{clinic_id}` — WhatsApp webhook for patient incoming messages.

---

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or pnpm

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate       # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed initial clinic database
python seed.py

# Run FastAPI development server
uvicorn app.main:app --reload --port 8000
```
Interactive documentation will be available at `http://localhost:8000/docs`.

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Next.js development server
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Testing & Quality Assurance

### Run Backend Pytest Suite
```bash
cd backend
pytest -v
```
**Output**: `107 passed` (100% pass rate covering API authentication, booking race conditions, pre-model safety gating, retention purge, Twilio signature verification, Marathi voice constraints, LiveKit WebRTC token generation, Deepgram Nova-2 multilingual STT, and end-to-end telemetry).

### Run Frontend Typecheck & Build
```bash
cd frontend
npx tsc --noEmit
npm run build
```
**Output**: `Compiled successfully` with zero TypeScript errors.

---

## License & Compliance

- **DPDP Act (India)**: Compliant with person-level consent, safe-contact suppression flags, and automatic 90-day retention purge routines.
- **Medical Disclaimer**: Parchi AI is an administrative receptionist engine only. It never provides medical diagnoses, treatment opinions, or prescription advice.
- **License**: MIT
