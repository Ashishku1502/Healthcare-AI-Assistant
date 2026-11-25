# Parchi: requirements status against the Asymmetri brief (current)
Status words: DONE (built or written, and tested where it is code), PARTIAL, NOT DONE, YOU DO (only you can produce it). 26 backend tests pass; frontend build passes.
## Hard constraints
- Price Rs 2,500: **DONE** (cost sheet, landing page).
- Variable cost at most Rs 1,000: **PARTIAL**. All-calls options cost Rs 8,930 and Rs 3,322 (over). Hybrid design is Rs 818 but rests on two unverified assumptions (35% forwarded, 50% templated).
- Keep clinic number; forwarding: **PARTIAL**. Signed voice webhook and transfer exist and are tested with simulated payloads; no real telephony provider is connected.
- Silence over 2 s: **PARTIAL**. Simulator plays a filler at 1.5 s and shows latency; not tested on real audio.
- One Android phone at reception: **PARTIAL**. Mobile Now tab and WhatsApp status commands exist and are tested at API level; not tested on a real phone.
- Team and time (10 weeks): **DONE** (weeks 3 / 6 / 10 in the memo).
- Consent, retention, access (DPDP): **PARTIAL**. Consent, opt-out, safe-contact flags, roles, audit and an events purge exist; retention only covers events.
## Unit costs
- Use the given unit costs and the mean call length: **DONE** (cost sheet, formulas, zero errors).
## Eight tensions
- 1 voice admits AI, 2 medical line (calls 2 and 5), 3 truth about the wait, 4 live state, 5 voice economics, 6 receptionist, 7 unsure live, 8 local rules: **DONE** in the memo; behaviours for 1, 2, 3, 7 and 8 are also tested in code. The owner's rules settings page for tension 8 is NOT DONE.
## Deliverables
- D1 Decision memo (cap 6 pages): **DONE**, 2 pages. You must make it your own words.
- D2 Three hand-drawn flows plus one screen: **YOU DO**. A guide to copy is supplied.
- D3 Scripts for calls 2, 4, 5, 7: **DONE**, one page.
- D4 Architecture, one diagram plus one page: **DONE**.
- D5 AI design, evaluation, policy (2 pages): **DONE**, one page.
- D6 Cost and scale sheet with formulas: **DONE**.
- D7 Working slice: code **DONE**; the 5-minute recording is **YOU DO**.
- D8 AI-use log plus "What I skimped on": **DONE**; check the two wrong-output examples are true for you.
## Rules
- Defend every line, work alone, five questions to the founder: **YOU DO**. Questions and defense prep are supplied.
## Not built
- Real telephony, STT and TTS provider adapters; real WhatsApp sender; walk-in token tracking; Alembic migrations; Redis rate limiting; real-audio tests; LLM layer; full Marathi answers (safety replies only).
