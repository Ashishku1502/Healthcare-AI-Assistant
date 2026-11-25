"""Deterministic administrative receptionist: en / Hinglish / Hindi / Marathi (safety lines only for mr).
Rules: never diagnose; urgent -> emergency path; wait info only from receptionist-set live state; no report/identity disclosure."""
import re
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import Clinic, Doctor, Patient, ChatSession, Event, now
from .booking import book, BookingError, free_slots

URGENT = (
    r"chest pain|dil (?:mein|me|mai) (?:dard|bhaari|bhari|jalan)|dil.*(?:ghabra|dhadkan)|ghabrahat|"
    r"chest (?:tight|heav|pressure)|s(?:ee|i)ne (?:mein|me|mai)|pain in (?:my )?chest|can'?t breathe|"
    r"breathless|bleeding|unconscious|seizure|stroke|heart attack|suicide|saans|s(?:ee|i)ne (?:mein|me|mai).*(?:dard|jalan)|"
    r"chhati.*dard|behosh|khoon|emergency|chakkar|faint|सीने|सांस|बेहोश|छातीत|श्वास"
)
MEDICAL = (
    r"\b(medicine|dawai|dawa|tablet|dose|diagnos\w*|prescri\w*|symptom\w*|fever|bukhar|taap|bimari|treatment|102|"
    r"infection\w*|ulti|vomit\w*)\b|दवा|बुखार|ताप"
)
REPORT = r"report|riport|prescription|test result|रिपोर्ट"
SALES = r"pharma|medical rep|representative|sales|company se|marketing"
RELAY = r"bol dena|bata dena|tell the doctor|aa raha hoon|aa rahe hain|coming in \d+|ka beta|ka bete|landlord"
NOMSG = r"message mat|msg mat|don'?t (send|message)|do not (send|message)|मैसेज मत"
YES = r"^(yes|y|confirm|haan|han|ha|ok|theek hai|hoy|हाँ|हां|होय)\b"
NO = r"^(no|n|cancel|nahi|nahin|nope|नहीं|नको)\b"

def lang(t: str) -> str:
    if re.search(r"\b(aahe|kay|kiti|nahi aahe|aale ka|mala|tumhi)\b|ळ", t.lower()):
        return "mr"
    if re.search(r"[\u0900-\u097F]", t):
        return "hi"
    return "hinglish" if re.search(r"\b(kya|hai|kab|kitna|mujhe|haan|nahi|aap|aa gaye|chahiye|batao|hain|bol)\b", t.lower()) else "en"

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

def wait_reply(db, s, docs):
    out, unsure = [], False
    for d in docs:
        fresh = d.status_at and (now() - d.status_at < timedelta(minutes=90))
        if fresh and d.status_state == "in":
            out.append(f"Dr {d.name} has arrived.")
        elif fresh and d.status_state == "late":
            out.append(f"Dr {d.name} is running about {d.late_minutes} minutes late (as told by the clinic).")
        elif fresh and d.status_state == "out":
            out.append(f"Dr {d.name} has not arrived yet.")
        else:
            unsure = True
            out.append(f"Dr {d.name}: the clinic has not confirmed the timing yet. I've asked the staff to update you.")
    _event(db, s, "wait", "handoff" if unsure else "answered", "Wait status unknown - please update doctor status" if unsure else "")
    return " ".join(out) or "No doctors are listed."

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
    if re.search(r"\b(tomorrow|kal|udya)\b", low):
        date_val = (now_dt + timedelta(days=1)).date()
    elif re.search(r"\b(today|aaj)\b", low):
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
        m_ampm = re.search(r"\b(\d{1,2})\s*(?:baje|am|pm)\b", low)
        if m_ampm:
            hh = int(m_ampm.group(1))
            if "pm" in low and hh < 12:
                hh += 12
            time_val = (hh, 0)

    return matched_doc, date_val, time_val

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
            return done(f"Confirmed. Appointment #{a.id} on {a.start:%d %b %Y, %I:%M %p}.")
        if re.search(NO, low):
            s.pending = {}
            return done("Okay, nothing was booked.")
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

    docs = db.query(Doctor).filter_by(clinic_id=clinic.id, active=True).all()

    # Clinic Facts
    if re.search(r"hours|timing|open|kab khult[aei]|samay|समय", low):
        _event(db, s, "hours", "answered")
        return done(f"{clinic.name} hours: {clinic.hours or 'not set; staff will confirm'}.")

    if re.search(r"address|location|kahan|pata|पता", low):
        _event(db, s, "address", "answered")
        return done(f"Address: {clinic.address or 'not set; staff will confirm'}.")

    if re.search(r"fee|fees|charge|kitna|price|शुल्क", low):
        _event(db, s, "fees", "answered")
        return done(f"Fees: {clinic.fees or 'not set; staff will confirm'}.")

    if re.search(r"late|wait|delay|intezaar|aa gaye|aaye|arrived|aale|देर|आ गए", low):
        return done(wait_reply(db, s, docs))

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
        return done(f"Please confirm: Dr {doc_cand.name} on {start_dt:%d %b %Y, %I:%M %p}. Reply YES to book or NO to cancel.")

    # Doctor availability & schedule inquiry
    if re.search(r"availab|doctor|slot|book|appointment|मिल", low):
        lines = []
        for d in docs:
            day, slots = find_earliest_free_slots(db, d)
            if slots and day:
                day_str = "tomorrow" if (day.date() - datetime.now().date()).days == 1 else day.strftime("%A, %d %b")
                slot_strs = ", ".join(f"{x:%Y-%m-%d %H:%M}" for x in slots)
                lines.append(f"Dr {d.name} ({d.speciality}): {slot_strs} ({day_str})")
            else:
                lines.append(f"Dr {d.name} ({d.speciality}): no free slots available soon")
        _event(db, s, "availability", "answered")
        return done(("\n".join(lines) or "No doctors listed.") + "\nTo book: 'book <doctor> YYYY-MM-DD HH:MM'")

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
