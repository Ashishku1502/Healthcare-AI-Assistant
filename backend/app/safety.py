"""Pre-model safety check for every incoming patient message.

Runs deterministically BEFORE any AI/LLM call, booking flow, or reply generation.
Emergency rules (chest pain, breathlessness, unconsciousness, seizure, heavy bleeding,
or child under 5 with fever) skip the AI reply, return a fixed ER/112 emergency message,
and alert clinic staff. Non-emergency medical questions never receive advice, offer the
earliest slot, alert the clinic, and log every trigger.
"""
import logging
import re
from dataclasses import dataclass
from sqlalchemy.orm import Session
from .models import Audit, SafetyTriggerLog

logger = logging.getLogger("parchi.safety")

FEVER_RE = re.compile(
    r"\b(fevers?|bukh?aa?r|taap|temp(?:erature)?)\b|बुखार|बुख़ार|ताप",
    re.I,
)

CHILD_CONTEXT_RE = re.compile(
    r"\b(child|children|kid|kids|baby|babies|infant|newborn|new-born|neonate|toddler|"
    r"son|daughter|boy|girl|bach?ch?a|bach?ch?e|bache|beta|beti|mulga|mulgi|baal|old)\b|"
    r"बच्चा|बच्चे|बच्चों|बेटे|बेटी|मुलगा|मुलगी|मुलाला|बाळ",
    re.I,
)

EMERGENCY_PATTERNS: list[tuple[str, re.Pattern]] = [
    (
        "chest_pain",
        re.compile(
            r"chest pain|pain in (?:my |the )?chest|chest (?:tight|heav|pressure|discomfort)|"
            r"dil (?:mein|me|mai) (?:dard|bhaari|bhari|jalan)|dil.*(?:ghabra|dhadkan)|ghabrahat|"
            r"s(?:ee|i)ne (?:mein|me|mai).*(?:dard|jalan)?|chhati.*dard|heart attack|"
            r"सीने|छातीत|धड़कन|घबराहट|धडकन",
            re.I,
        ),
    ),
    (
        "breathlessness",
        re.compile(
            r"can'?t breathe|cannot breathe|unable to breathe|breathless\w*|"
            r"shortness of breath|difficulty breathing|trouble breathing|hard to breathe|not breathing|"
            r"saans|सांस|श्वास",
            re.I,
        ),
    ),
    (
        "unconsciousness",
        re.compile(
            r"unconscious\w*|passed out|not waking up|unresponsive|faint\w*|collaps\w*|"
            r"behosh|chakkar|बेहोश|बेशुद्ध",
            re.I,
        ),
    ),
    (
        "seizure",
        re.compile(
            r"\b(seizures?|convulsions?|epilep\w*|mirgi|daura|daure)\b|"
            r"\b(?:having|getting|had|multiple)\s+fits\b|झटके|दौरा|मिर्गी",
            re.I,
        ),
    ),
    (
        "heavy_bleeding",
        re.compile(
            r"(?:heavy|severe|profuse|non-?stop|uncontrolled)?\s*bleeding|"
            r"hemorrhage|khoon\s*(?:beh|nikal|bah|ruk|zyada)|bahut\s*khoon|रक्तस्त्राव|खून\s*(?:बह|निकल)",
            re.I,
        ),
    ),
    (
        "other_emergency",
        re.compile(r"\b(stroke|suicide|emergency)\b", re.I),
    ),
]

MEDICAL_QUESTION_RE = re.compile(
    r"\b(medicine|medicines|dawai|dawaiyan|dawa|tablet|tablets|pill|pills|syrup|capsule|ointment|"
    r"dose|dosage|diagnos\w*|prescri\w*|symptom\w*|fever|bukhar|bukhaar|taap|bimari|treatment|"
    r"102|103|104|infection\w*|ulti|vomit\w*|headache|migraine|cough|cold|khansi|zukam|jukam|"
    r"rash|itching|antibiotic\w*|paracetamol|crocin|ibuprofen|diarrhea|dast|loose motion|nausea|"
    r"diabetes|blood pressure|side effect\w*|stomach ache|stomach pain|back pain|ear pain|throat pain|"
    r"should i take|can i take|what should i take|which medicine|kaunsi goli|kaunsi dawa|medical advice)\b|"
    r"दवा|दवाई|बुखार|ताप|औषध|गोळी|उलटी|खांसी|दर्द",
    re.I,
)


def is_child_under_5_with_fever(text: str) -> bool:
    """Detect whether the message describes a child under age 5 with fever."""
    low = text.lower()
    if not FEVER_RE.search(low):
        return False

    if re.search(
        r"\b(?:under|below|less than|<)\s*(?:5|five)\b|"
        r"\b5\s*(?:saal|years?|yrs?)\s*(?:se\s*kam|or\s*under)\b|"
        r"5\s*साल\s*से\s*कम|पाच\s*वर्षाखालील",
        low,
    ):
        return True

    if re.search(r"\b(newborn|new-born|neonate|infant|toddler|chhota bach?cha)\b|नवजात|शिशु", low):
        return True

    for m in re.finditer(
        r"\b(\d+(?:\.\d+)?)\s*[-]?\s*(?:year|years|yr|yrs|y/o|yo|saal)\b|"
        r"(\d+(?:\.\d+)?)\s*[-]?\s*(?:साल|वर्ष|वर्षाचा|वर्षाची|वर्षाच्या)",
        low,
    ):
        age_str = m.group(1) or m.group(2)
        prefix = low[max(0, m.start() - 12):m.start()]
        if re.search(r"\b(?:for|since|past|last)\s+$", prefix):
            continue
        if float(age_str) < 5.0:
            return True

    # Months/weeks only count as age (not duration) when paired with child/old context
    if CHILD_CONTEXT_RE.search(low):
        for m in re.finditer(r"\b(\d+)\s*[-]?\s*(?:month|months|mo|mahine|mahina|महीने|महिना)\b", low):
            prefix = low[max(0, m.start() - 12):m.start()]
            if not re.search(r"\b(?:for|since|past|last)\s+$", prefix) and int(m.group(1)) < 60:
                return True

    return False


@dataclass(frozen=True)
class SafetyResult:
    category: str | None  # "urgent" | "medical" | None
    trigger_rule: str | None
    skip_ai: bool


def pre_model_safety_check(message: str) -> SafetyResult:
    """Deterministic pre-model safety gate executed on every patient message."""
    t = (message or "").strip()
    if not t:
        return SafetyResult(category=None, trigger_rule=None, skip_ai=False)

    for rule_name, pattern in EMERGENCY_PATTERNS:
        if pattern.search(t):
            return SafetyResult(category="urgent", trigger_rule=rule_name, skip_ai=True)

    if is_child_under_5_with_fever(t):
        return SafetyResult(category="urgent", trigger_rule="child_under_5_fever", skip_ai=True)

    if MEDICAL_QUESTION_RE.search(t):
        return SafetyResult(category="medical", trigger_rule="medical_question", skip_ai=True)

    return SafetyResult(category=None, trigger_rule=None, skip_ai=False)


def log_safety_trigger(
    db: Session,
    clinic_id: int,
    channel: str,
    session_id: str,
    result: SafetyResult,
    message: str,
    staff_alerted: bool = True,
) -> None:
    """Persist an immutable record of every pre-model safety trigger."""
    if not result.category:
        return
    excerpt = (message or "").strip()[:300]
    db.add(
        SafetyTriggerLog(
            clinic_id=clinic_id,
            channel=channel or "web",
            session_id=session_id or "",
            category=result.category,
            trigger_rule=result.trigger_rule or "unknown",
            message_excerpt=excerpt,
            staff_alerted=staff_alerted,
            ai_skipped=result.skip_ai,
        )
    )
    db.add(
        Audit(
            clinic_id=clinic_id,
            actor=f"safety-gate:{channel or 'web'}",
            action=f"safety:{result.category}:{result.trigger_rule} msg={excerpt[:100]}",
        )
    )
    logger.warning(
        "SAFETY_TRIGGER clinic_id=%s channel=%s session=%s category=%s rule=%s staff_alerted=%s ai_skipped=%s",
        clinic_id,
        channel,
        session_id,
        result.category,
        result.trigger_rule,
        staff_alerted,
        result.skip_ai,
    )
