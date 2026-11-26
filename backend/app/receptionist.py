"""Deterministic administrative receptionist: en / Hinglish / Hindi / Marathi (safety lines only for mr).
Rules: never diagnose; urgent -> emergency path; wait info only from receptionist-set live state; no report/identity disclosure."""
import re
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import Clinic, Doctor, Patient, ChatSession, Event, ClinicRule, now
from .booking import book, BookingError, free_slots
from . import llm

URGENT = (
    r"chest pain|dil (?:mein|me|mai) (?:dard|bhaari|bhari|jalan)|dil.*(?:ghabra|dhadkan)|ghabrahat|"
    r"chest (?:tight|heav|pressure)|s(?:ee|i)ne (?:mein|me|mai)|pain in (?:my )?chest|can'?t breathe|cannot breathe|"
    r"breathless|bleeding|unconscious|seizure|stroke|heart attack|suicide|saans|s(?:ee|i)ne (?:mein|me|mai).*(?:dard|jalan)|"
    r"chhati.*dard|behosh|khoon|emergency|chakkar|faint|सीने|सांस|बेहोश|छातीत|श्वास|धड़कन|घबराहट|धडकन|बेशुद्ध|रक्तस्त्राव"
)
MEDICAL = (
    r"\b(medicine|dawai|dawa|tablet|dose|diagnos\w*|prescri\w*|symptom\w*|fever|bukhar|taap|bimari|treatment|102|"
    r"infection\w*|ulti|vomit\w*)\b|दवा|बुखार|ताप|औषध|गोळी|उलटी"
)
REPORT = r"report|riport|prescription|test result|रिपोर्ट"
SALES = r"pharma|medical rep|representative|sales|company se|marketing"
RELAY = r"bol dena|bata dena|tell the doctor|aa raha hoon|aa rahe hain|coming in \d+|ka beta|ka bete|landlord"
NOMSG = r"message mat|msg mat|don'?t (send|message)|do not (send|message)|मैसेज मत"
YES = r"^(yes|y|confirm|haan|han|ha|ok|theek hai|hoy|हाँ|हां|होय)\b"
NO = r"^(no|n|cancel|nahi|nahin|nope|nako|नहीं|नको)\b"

def lang(t: str) -> str:
    low = t.lower()
    if re.search(r"\b(aahe|kay|kiti|nahi aahe|aale ka|aale|mala|tumhi|vel|patta|kuthe|kadhi|hoy|nako|udya|kara|karayche)\b|आहे|काय|किती|आले|पत्ता|वेळ|कुठे|केव्हा|होय|नको|उद्या|करा|ळ", low):
        return "mr"
    if re.search(r"[\u0900-\u097F]", t):
        return "hi"
    return "hinglish" if re.search(r"\b(kya|hai|kab|kitna|mujhe|haan|nahi|aap|aa gaye|chahiye|batao|hain|bol)\b", low) else "en"

DISC = {
    "en": "I'm Parchi, the clinic's AI assistant. ",
    "hinglish": "Main Parchi hoon, clinic ka AI sahayak. ",
    "hi": "मैं पारची हूँ, क्लिनिक की AI सहायक। ",
    "mr": "मी पारची, क्लिनिकची AI सहाय्यक. "
}

M = {
 "urgent": {
    "en": "This could be urgent. Please call 112 or go to the nearest hospital right now. I am alerting clinic staff to call you.",
    "hinglish": "Yeh urgent ho sakta hai. Abhi 112 par call karein ya nazdeeki hospital jaayein. Main clinic staff ko aapko call karne ke liye bata rahi hoon.",
    "hi": "यह आपात स्थिति हो सकती है। अभी 112 पर कॉल करें या नज़दीकी अस्पताल जाएँ। मैं क्लिनिक स्टाफ को आपको कॉल करने के लिए सूचित कर रही हूँ।",
    "mr": "हे आपत्कालीन असू शकते. आत्ताच 112 वर कॉल करा किंवा जवळच्या रुग्णालयात जा. मी क्लिनिक स्टाफला कळवत आहे."
 },
 "medical": {
    "en": "I can't give medical advice. I've sent your question to the doctor's team and they will call you back. If the child has trouble breathing, is very drowsy or has a seizure, call 112 now. I can also check the earliest appointment: say 'availability'.",
    "hinglish": "Main medical salah nahi de sakti. Aapka sawal doctor ki team ko bhej diya hai, woh aapko call karenge. Agar bachche ko saans mein dikkat, bahut neend ya daura ho to abhi 112 karein. Sabse jaldi appointment ke liye 'availability' bolein.",
    "hi": "मैं चिकित्सकीय सलाह नहीं दे सकती। आपका सवाल डॉक्टर की टीम को भेज दिया है, वे आपको कॉल करेंगे। साँस में तकलीफ़, बहुत नींद या दौरा हो तो अभी 112 करें।",
    "mr": "मी वैद्यकीय सल्ला देऊ शकत नाही. तुमचा प्रश्न डॉक्टरांच्या टीमला पाठवला आहे, ते तुम्हाला कॉल करतील. श्वास घेण्यास त्रास किंवा झटके आल्यास लगेच 112 करा."
 },
 "unknown": {
    "en": "I'm not sure I understood. I'm passing this to clinic staff who will call you.",
    "hinglish": "Mujhe pakka samajh nahi aaya. Main clinic staff ko de rahi hoon, woh aapko call karenge.",
    "hi": "मुझे ठीक से समझ नहीं आया। मैं क्लिनिक स्टाफ को दे रही हूँ, वे आपको कॉल करेंगे।",
    "mr": "मला नीट समजले नाही. मी क्लिनिक स्टाफला देत आहे, ते तुम्हाला कॉल करतील."
 },
 "hours": {
    "en": "{name} hours: {val}.",
    "mr": "{name} ची वेळ: {val}."
 },
 "address": {
    "en": "Address: {val}.",
    "mr": "पत्ता: {val}."
 },
 "fees": {
    "en": "Fees: {val}.",
    "mr": "फी: {val}."
 },
 "wait_arrived": {
    "en": "Dr {name} has arrived.",
    "mr": "डॉ. {name} आले आहेत."
 },
 "wait_late": {
    "en": "Dr {name} is running about {minutes} minutes late (as told by the clinic).",
    "mr": "डॉ. {name} यांना सुमारे {minutes} मिनिटे उशीर होणार आहे (क्लिनिकने दिलेल्या माहितीनुसार)."
 },
 "wait_out": {
    "en": "Dr {name} has not arrived yet.",
    "mr": "डॉ. {name} अजून आलेले नाहीत."
 },
 "wait_unsure": {
    "en": "Dr {name}: the clinic has not confirmed the timing yet (status is unconfirmed). I can issue you a token or arrange a callback from staff.",
    "mr": "डॉ. {name}: क्लिनिकने अद्याप वेळेची पुष्टी केलेली नाही (स्थिती अनिश्चित आहे). मी तुम्हाला टोकन देऊ शकते किंवा स्टाफकडून कॉलबॅकची व्यवस्था करू शकते."
 },
 "wait_none": {
    "en": "No doctors are listed.",
    "mr": "कोणतेही डॉक्टर उपलब्ध नाहीत."
 },
 "booking_confirm_prompt": {
    "en": "Please confirm: Dr {name} on {dt}. Reply YES to book or NO to cancel.",
    "mr": "कृपया पुष्टी करा: डॉ. {name}, {dt}. बुक करण्यासाठी HOY किंवा रद्द करण्यासाठी NAKO लिहा."
 },
 "booking_confirmed": {
    "en": "Confirmed. Appointment #{id} on {dt}.",
    "mr": "पुष्टी झाली. अपॉइंटमेंट #{id}, {dt}."
 },
 "booking_cancelled": {
    "en": "Okay, nothing was booked.",
    "mr": "ठीक आहे, काहीही बुक केलेले नाही."
 },
 "booking_reprompt": {
    "en": "Please reply YES to confirm or NO to cancel.",
    "mr": "कृपया पुष्टी करण्यासाठी HOY किंवा रद्द करण्यासाठी NAKO लिहा."
 },
 "not_set": {
    "en": "not set; staff will confirm",
    "mr": "निश्चित नाही; स्टाफ पुष्टी करेल"
 }
}

def _event(db, s, intent, outcome, note=""):
    ev = db.get(Event, s.event_id) if s.event_id else None
    if not ev:
        ev = Event(clinic_id=s.clinic_id, channel=s.channel)
        db.add(ev)
        db.flush()
        s.event_id = ev.id
    if ev.intent == "other" or intent != "other":
        ev.intent = intent
    if outcome in ("urgent", "booked") or ev.outcome != "urgent":
        ev.outcome = outcome
    if note:
        ev.note = note[:200]

def get_session(db, clinic_id, channel, ext):
    s = db.query(ChatSession).filter_by(clinic_id=clinic_id, channel=channel, external_id=ext).first()
    if not s:
        s = ChatSession(clinic_id=clinic_id, channel=channel, external_id=ext, pending={})
        db.add(s)
        db.flush()
    return s

def wait_reply(db, s, docs, lang="en", user_token: int | None = None):
    out, unsure = [], False
    is_mr = (lang == "mr")
    for d in docs:
        fresh = d.status_at and (now() - d.status_at <= timedelta(minutes=30))
        if fresh and d.status_state == "in":
            out.append(M["wait_arrived"]["mr" if is_mr else "en"].format(name=d.name))
        elif fresh and d.status_state == "late":
            out.append(M["wait_late"]["mr" if is_mr else "en"].format(name=d.name, minutes=d.late_minutes))
        elif fresh and d.status_state == "out":
            out.append(M["wait_out"]["mr" if is_mr else "en"].format(name=d.name))
        else:
            unsure = True
            out.append(M["wait_unsure"]["mr" if is_mr else "en"].format(name=d.name))

        # Token gap calculation
        if getattr(d, "current_token", 0) and d.current_token > 0:
            if user_token is not None:
                gap = user_token - d.current_token
                slot_m = d.slot_minutes or 15
                if gap > 0:
                    est_wait = gap * slot_m
                    if d.status_state == "late" and d.late_minutes:
                        est_wait += d.late_minutes
                    if is_mr:
                        out.append(f"सध्या टोकन {d.current_token} सुरू आहे. तुमचे टोकन {user_token} आहे ({gap} टोकन शिल्लक, अंदाजे {est_wait} मिनिटे प्रतीक्षा).")
                    elif lang == "hi":
                        out.append(f"अभी टोकन {d.current_token} चल रहा है। आपका टोकन {user_token} है ({gap} टोकन बाकी, लगभग {est_wait} मिनट का इंतजार).")
                    elif lang == "hinglish":
                        out.append(f"Abhi token {d.current_token} chal raha hai. Aapka token {user_token} hai ({gap} tokens baaki, lagbhag {est_wait} min wait).")
                    else:
                        out.append(f"Current token is {d.current_token}. Your token is {user_token} ({gap} tokens away, ~{est_wait} mins wait).")
                elif gap == 0:
                    if is_mr:
                        out.append(f"सध्या टोकन {d.current_token} सुरू आहे. आता तुमचाच नंबर आहे!")
                    elif lang in ("hi", "hinglish"):
                        out.append(f"Abhi token {d.current_token} chal raha hai. Abhi aapka hi number hai!")
                    else:
                        out.append(f"Current token is {d.current_token}. It is your turn right now!")
                else:  # gap < 0
                    if is_mr:
                        out.append(f"सध्या टोकन {d.current_token} सुरू आहे. तुमचे टोकन {user_token} उलटून गेले आहे, कृपया डेस्कवर संपर्क साधा.")
                    elif lang in ("hi", "hinglish"):
                        out.append(f"Abhi token {d.current_token} chal raha hai. Aapka token {user_token} nikal chuka hai, please desk par baat karein.")
                    else:
                        out.append(f"Current token is {d.current_token}. Your token {user_token} has already passed. Please check with the desk.")
            else:
                if is_mr:
                    out.append(f"सध्या टोकन {d.current_token} सुरू आहे.")
                elif lang == "hi":
                    out.append(f"वर्तमान टोकन {d.current_token} चल रहा है।")
                elif lang == "hinglish":
                    out.append(f"Current token {d.current_token} chal raha hai.")
                else:
                    out.append(f"Current token is {d.current_token}.")

    _event(db, s, "wait", "handoff" if unsure else "answered", "Wait status unknown - please update doctor status" if unsure else "")
    return " ".join(out) or M["wait_none"]["mr" if is_mr else "en"]

def find_earliest_free_slots(db: Session, d: Doctor, max_days=4) -> tuple[datetime | None, list[datetime]]:
    today = datetime.now()
    for offset in range(1, max_days + 1):
        target_day = today + timedelta(days=offset)
        slots = free_slots(db, d, target_day, limit=5)
        if slots:
            return target_day, slots
    return None, []

def parse_booking_request(low: str, docs: list[Doctor]):
    """Extract doctor, date, and time from user booking requests across formats."""
    # 1. Doctor matching
    matched_doc = None
    for d in docs:
        d_name_clean = d.name.lower().replace("dr.", "").replace("dr ", "").strip()
        first_token = d_name_clean.split()[0] if d_name_clean else ""
        if d_name_clean in low or (first_token and first_token in low):
            matched_doc = d
            break
    if not matched_doc and docs:
        if "dr" in low or "doctor" in low or "book" in low:
            # Check if any doctor name substring is in low
            for d in docs:
                for token in d.name.lower().split():
                    if len(token) > 2 and token in low:
                        matched_doc = d
                        break
                if matched_doc:
                    break

    # 2. Date matching
    date_val = None
    now_dt = datetime.now()
    if re.search(r"\b(tomorrow|kal|udya)\b|उद्या", low):
        date_val = (now_dt + timedelta(days=1)).date()
    elif re.search(r"\b(today|aaj)\b|आज", low):
        date_val = now_dt.date()
    else:
        m_iso = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", low)
        if m_iso:
            try:
                date_val = datetime.strptime(f"{m_iso.group(1)}-{m_iso.group(2)}-{m_iso.group(3)}", "%Y-%m-%d").date()
            except ValueError:
                pass
        if not date_val:
            m_dmy = re.search(r"\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b", low)
            if m_dmy:
                try:
                    date_val = datetime.strptime(f"{m_dmy.group(1)}-{m_dmy.group(2)}-{m_dmy.group(3)}", "%d-%m-%Y").date()
                except ValueError:
                    pass

    # 3. Time matching
    time_val = None
    m_time = re.search(r"\b(\d{1,2}):(\d{2})\b", low)
    if m_time:
        hh, mm = int(m_time.group(1)), int(m_time.group(2))
        time_val = (hh, mm)
    else:
        m_ampm = re.search(r"\b(\d{1,2})\s*(?:baje|am|pm|vaajta|vajata|वाजता)\b", low)
        if m_ampm:
            hh = int(m_ampm.group(1))
            if "pm" in low and hh < 12:
                hh += 12
            time_val = (hh, 0)

    return matched_doc, date_val, time_val

def _format_availability(db: Session, docs: list[Doctor]) -> str:
    lines = []
    for d in docs:
        day, slots = find_earliest_free_slots(db, d)
        if slots and day:
            day_str = "tomorrow" if (day.date() - datetime.now().date()).days == 1 else day.strftime("%A, %d %b")
            slot_strs = ", ".join(f"{x:%Y-%m-%d %H:%M}" for x in slots)
            lines.append(f"Dr {d.name} ({d.speciality}): {slot_strs} ({day_str})")
        else:
            lines.append(f"Dr {d.name} ({d.speciality}): no free slots available soon")
    return ("\n".join(lines) or "No doctors listed.") + "\nTo book: 'book <doctor> YYYY-MM-DD HH:MM'"

def reply(db: Session, clinic: Clinic, s: ChatSession, patient: Patient | None, text: str) -> str:
    t = text.strip()
    low = t.lower()
    L = lang(t)
    first = s.event_id is None
    pre = DISC[L] if first else ""
    def done(msg):
        db.commit()
        return pre + msg

    # Safety: always check emergency first
    if re.search(URGENT, low):
        s.pending = {}
        _event(db, s, "urgent", "urgent", "URGENT symptom mentioned - call patient now")
        return done(M["urgent"][L])

    p = dict(s.pending or {})
    # Confirmation of pending booking
    if p.get("awaiting") == "confirm":
        if re.search(YES, low):
            # If patient is not passed in this turn, try to recover from pending state
            actual_patient = patient
            if not actual_patient and p.get("patient_id"):
                actual_patient = db.get(Patient, p["patient_id"])
            if not actual_patient:
                if L == "mr":
                    return done("कृपया प्रथम तुमचे नाव आणि फोन नंबर सांगा.")
                return done("Please share your name and phone number first.")
            try:
                a = book(
                    db,
                    clinic.id,
                    p["doctor_id"],
                    actual_patient.id,
                    datetime.fromisoformat(p["start"]),
                    s.channel,
                    f"patient:{actual_patient.id}"
                )
            except BookingError as e:
                s.pending = {}
                _event(db, s, "booking", "answered")
                return done(f"Sorry, I couldn't book that: {e}. Say 'availability' to see free slots.")
            s.pending = {}
            _event(db, s, "booking", "booked")
            dt_str = f"{a.start:%d %b %Y, %I:%M %p}"
            if L == "mr":
                return done(M["booking_confirmed"]["mr"].format(id=a.id, dt=dt_str))
            return done(f"Confirmed. Appointment #{a.id} on {dt_str}.")
        if re.search(NO, low):
            s.pending = {}
            if L == "mr":
                return done(M["booking_cancelled"]["mr"])
            return done("Okay, nothing was booked.")
        if L == "mr":
            return done(M["booking_reprompt"]["mr"])
        return done("Please reply YES to confirm or NO to cancel.")

    if re.search(NOMSG, low):
        if patient:
            patient.no_message = True
        _event(db, s, "privacy", "handoff", "Patient asked: do NOT message this number")
        return done("Understood. I will not send messages to this number. I can still help on calls.")

    if re.search(SALES, low):
        _event(db, s, "sales", "handoff", "Sales/rep enquiry - staff to decide")
        return done("Thank you. I've noted your request and passed it to the clinic staff, who will get back to you if the doctor can meet.")

    if re.search(REPORT, low):  # no identity proof by voice/number: never disclose
        _event(db, s, "report", "handoff", "Report query - verify identity, then answer")
        return done("I can't share report details here because I can't verify who is asking. The clinic staff will check and call you back.")

    if re.search(RELAY, low):  # message relay, no queue-jumping
        _event(db, s, "relay", "handoff", t)
        return done("I've passed your message to the clinic staff. Visits are in token order unless the clinic says otherwise.")

    if re.search(MEDICAL, low):
        _event(db, s, "medical", "handoff", "Medical question - doctor/staff callback needed: " + t)
        return done(M["medical"][L])

    # Load versioned local rules set by clinic owner (Tension 8: local rules)
    rules = {r.rule_key: r.rule_value for r in db.query(ClinicRule).filter_by(clinic_id=clinic.id, active=True).all()}

    # Local rule: queue priority (e.g. "elderly first")
    if "queue_priority" in rules and re.search(r"\b(elderly|senior|buzurg|bujurg|old age|priority|pehla|first)\b", low):
        _event(db, s, "priority", "answered")
        return done(f"Clinic policy: {rules['queue_priority']}. Please let the reception desk know when you arrive.")

    docs = db.query(Doctor).filter_by(clinic_id=clinic.id, active=True).all()

    # Clinic Facts (local hours rule takes precedence over default clinic hours if set)
    effective_hours = rules.get("hours") or clinic.hours
    if re.search(r"hours|timing|open|kab khult[aei]|samay|समय|vel|kadhi|केव्हा|वेळ|उघड", low):
        _event(db, s, "hours", "answered")
        if L == "mr":
            val = effective_hours or M["not_set"]["mr"]
            return done(M["hours"]["mr"].format(name=clinic.name, val=val))
        return done(f"{clinic.name} hours: {effective_hours or 'not set; staff will confirm'}.")

    if re.search(r"address|location|kahan|pata|पता|patta|kothe|kuthe|पत्ता|कुठे", low):
        _event(db, s, "address", "answered")
        if L == "mr":
            val = clinic.address or M["not_set"]["mr"]
            return done(M["address"]["mr"].format(val=val))
        return done(f"Address: {clinic.address or 'not set; staff will confirm'}.")

    m_tok = re.search(r"(?:token|tok|टोकन)(?:\s*(?:no|number|num|\#))?\s*(\d{1,4})", low)
    user_token = int(m_tok.group(1)) if m_tok else None

    if re.search(r"late|wait|delay|intezaar|aa gaye|aaye|arrived|aale|देर|आ गए|ushir|उशीर|आले|kitna wait|kitni der|token|doctor (?:in|out|hai|aaye|aale)|is (?:the )?doctor in|how long.*wait", low):
        return done(wait_reply(db, s, docs, lang=L, user_token=user_token))

    if re.search(r"fee|fees|charge|kitna|price|शुल्क|kiti|दर|फी", low):
        _event(db, s, "fees", "answered")
        if L == "mr":
            val = clinic.fees or M["not_set"]["mr"]
            return done(M["fees"]["mr"].format(val=val))
        return done(f"Fees: {clinic.fees or 'not set; staff will confirm'}.")

    # Natural appointment booking request parser
    doc_cand, date_cand, time_cand = parse_booking_request(low, docs)
    if doc_cand and date_cand and time_cand:
        start_dt = datetime.combine(date_cand, datetime.min.time()).replace(hour=time_cand[0], minute=time_cand[1])
        if start_dt not in free_slots(db, doc_cand, start_dt, limit=500):
            return done("That slot is not available. Say 'availability' to see free slots.")
        pending_data = {
            "awaiting": "confirm",
            "doctor_id": doc_cand.id,
            "start": start_dt.isoformat()
        }
        if patient:
            pending_data["patient_id"] = patient.id
        s.pending = pending_data
        _event(db, s, "booking", "answered")
        dt_str = f"{start_dt:%d %b %Y, %I:%M %p}"
        if L == "mr":
            return done(M["booking_confirm_prompt"]["mr"].format(name=doc_cand.name, dt=dt_str))
        return done(f"Please confirm: Dr {doc_cand.name} on {dt_str}. Reply YES to book or NO to cancel.")

    # Doctor availability & schedule inquiry
    if re.search(r"availab|doctor|slot|book|appointment|मिल", low):
        _event(db, s, "availability", "answered")
        return done(_format_availability(db, docs))

    # LLM intent classifier fallback (only if cap not reached and confidence >= 0.7)
    if llm.check_and_increment_cap(clinic.id):
        res = llm.classify(t, L)
        intent = res.get("intent", "other")
        confidence = float(res.get("confidence", 0.0))
        if confidence >= 0.7:
            if intent == "hours":
                _event(db, s, "hours", "answered")
                if L == "mr":
                    val = clinic.hours or M["not_set"]["mr"]
                    return done(M["hours"]["mr"].format(name=clinic.name, val=val))
                return done(f"{clinic.name} hours: {clinic.hours or 'not set; staff will confirm'}.")
            elif intent == "address":
                _event(db, s, "address", "answered")
                if L == "mr":
                    val = clinic.address or M["not_set"]["mr"]
                    return done(M["address"]["mr"].format(val=val))
                return done(f"Address: {clinic.address or 'not set; staff will confirm'}.")
            elif intent == "fees":
                _event(db, s, "fees", "answered")
                if L == "mr":
                    val = clinic.fees or M["not_set"]["mr"]
                    return done(M["fees"]["mr"].format(val=val))
                return done(f"Fees: {clinic.fees or 'not set; staff will confirm'}.")
            elif intent == "wait":
                return done(wait_reply(db, s, docs, lang=L, user_token=user_token))
            elif intent in ("availability", "booking"):
                _event(db, s, "availability", "answered")
                return done(_format_availability(db, docs))

    _event(db, s, "other", "handoff", "Not understood: " + t)
    return done(M["unknown"][L])

def unclear_turn(db: Session, s: ChatSession) -> tuple[str, bool]:
    """Speech not understood: 1st time ONE yes/no question; 2nd time human callback. Never a menu."""
    n = int((s.pending or {}).get("unclear", 0)) + 1
    s.pending = {**(s.pending or {}), "unclear": n}
    if n >= 2:
        _event(db, s, "other", "handoff", "Caller not understood twice - call back now")
        s.pending = {}
        db.commit()
        return "Main clinic staff ko aapka number de rahi hoon, woh abhi aapko call karenge.", True
    db.commit()
    return "Kya aap doctor sahab ke aane ke baare mein pooch rahe hain? Haan ya nahi boliye.", False
