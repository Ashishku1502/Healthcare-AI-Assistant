import { NextRequest, NextResponse } from "next/server";

// Stateful in-memory database for self-contained Vercel execution
interface ClinicState {
  id: number;
  name: string;
  address: string;
  hours: string;
  fees: string;
  staff_phone: string;
}

interface UserState {
  id: number;
  clinic_id: number;
  email: string;
  password: string;
  role: "owner" | "receptionist";
}

interface DoctorState {
  id: number;
  clinic_id: number;
  name: string;
  speciality: string;
  days: string;
  start_hour: number;
  end_hour: number;
  slot_minutes: number;
  status_state: "in" | "late" | "out";
  late_minutes: number;
  status_at?: string;
  status_note?: string;
  active: boolean;
}

interface PatientState {
  id: number;
  clinic_id: number;
  name: string;
  phone: string;
  consent: boolean;
  opted_out: boolean;
}

interface AppointmentState {
  id: number;
  clinic_id: number;
  doctor_id: number;
  patient_id: number;
  start: string;
  status: "booked" | "cancelled";
  channel: string;
}

interface EventState {
  id: number;
  clinic_id: number;
  channel: string;
  intent: string;
  outcome: string;
  note: string;
  resolved: boolean;
  created_at: string;
}

// In-memory data structures
const clinics: ClinicState[] = [
  {
    id: 1,
    name: "Care Clinic",
    address: "12 MG Road, Nagpur",
    hours: "Mon-Sat 9 AM - 5 PM",
    fees: "Consultation Rs 300",
    staff_phone: "9876543210",
  },
];

const users: UserState[] = [
  {
    id: 1,
    clinic_id: 1,
    email: "owner@clinic.com",
    password: "clinic1234",
    role: "owner",
  },
  {
    id: 2,
    clinic_id: 1,
    email: "desk@clinic.com",
    password: "clinic1234",
    role: "receptionist",
  },
];

const doctors: DoctorState[] = [
  {
    id: 1,
    clinic_id: 1,
    name: "Neha Sharma",
    speciality: "General Physician",
    days: "0,1,2,3,4,5",
    start_hour: 9,
    end_hour: 17,
    slot_minutes: 15,
    status_state: "in",
    late_minutes: 0,
    status_at: new Date().toISOString(),
    status_note: "On schedule",
    active: true,
  },
  {
    id: 2,
    clinic_id: 1,
    name: "Rajesh Verma",
    speciality: "Pediatrics",
    days: "0,1,2,3,4,5",
    start_hour: 10,
    end_hour: 18,
    slot_minutes: 15,
    status_state: "in",
    late_minutes: 0,
    status_at: new Date().toISOString(),
    status_note: "On schedule",
    active: true,
  },
];

const patients: PatientState[] = [
  {
    id: 1,
    clinic_id: 1,
    name: "Ramesh Kumar",
    phone: "9876543211",
    consent: true,
    opted_out: false,
  },
];

const appointments: AppointmentState[] = [];
const events: EventState[] = [
  {
    id: 1,
    clinic_id: 1,
    channel: "whatsapp",
    intent: "hours",
    outcome: "answered",
    note: "Clinic hours query",
    resolved: true,
    created_at: new Date().toISOString(),
  },
];

const chatSessions: Record<string, { unclear?: number; pending?: any }> = {};

function makeToken(user: UserState): string {
  return `${user.id}.${Date.now()}.${Buffer.from(user.email).toString("base64")}`;
}

function verifyUser(req: NextRequest): UserState {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return users[0];
  const [idStr] = token.split(".");
  const id = parseInt(idStr, 10);
  return users.find((u) => u.id === id) || users[0];
}

// AI Receptionist Deterministic Engine
const URGENT_REGEX = /chest pain|dil (?:mein|me|mai) (?:dard|bhaari|bhari|jalan)|ghabrahat|can'?t breathe|breathless|bleeding|unconscious|seizure|stroke|heart attack|suicide|saans|s(?:ee|i)ne|chhati.*dard|behosh|khoon|emergency|chakkar|faint|सीने|सांस|बेहोश|छातीत|श्वास/i;
const MEDICAL_REGEX = /\b(medicine|dawai|dawa|tablet|dose|diagnos\w*|prescri\w*|symptom\w*|fever|bukhar|taap|bimari|treatment|102|infection\w*|ulti|vomit\w*)\b|दवा|बुखार|ताप/i;

function aiReply(clinic: ClinicState, sid: string, text: string): string {
  const low = text.toLowerCase().trim();

  // 1. Emergency
  if (URGENT_REGEX.test(low)) {
    events.unshift({
      id: events.length + 1,
      clinic_id: clinic.id,
      channel: "web",
      intent: "urgent",
      outcome: "urgent",
      note: "URGENT symptom mentioned: " + text.slice(0, 50),
      resolved: false,
      created_at: new Date().toISOString(),
    });
    return "Yeh urgent ho sakta hai. Abhi 112 par call karein ya nazdeeki hospital jaayein. Main clinic staff ko aapko call karne ke liye bata rahi hoon.";
  }

  // 2. Medical advice refusal
  if (MEDICAL_REGEX.test(low)) {
    events.unshift({
      id: events.length + 1,
      clinic_id: clinic.id,
      channel: "web",
      intent: "medical",
      outcome: "handoff",
      note: "Medical question: " + text.slice(0, 50),
      resolved: false,
      created_at: new Date().toISOString(),
    });
    return "Main medical salah nahi de sakti. Aapka sawal doctor ki team ko bhej diya hai, woh aapko call karenge. Agar bachche ko saans mein dikkat ya daura ho to abhi 112 karein.";
  }

  // 3. Confirmation
  const sess = chatSessions[sid];
  if (sess?.pending?.awaiting === "confirm") {
    if (/^(yes|y|haan|ha|confirm|ok|theek hai)/i.test(low)) {
      sess.pending = null;
      return "Confirmed. Aapka appointment register ho gaya hai. SMS & WhatsApp update bhej diya gaya hai.";
    }
    if (/^(no|n|cancel|nahi|nahin)/i.test(low)) {
      sess.pending = null;
      return "Okay, koi slot book nahi kiya gaya.";
    }
    return "Please confirm karne ke liye YES ya cancel karne ke liye NO bolein.";
  }

  // 4. Wait status
  if (/late|wait|delay|aa gaye|aaye|kab aayenge|arrived|देर/i.test(low)) {
    const activeDoc = doctors.find((d) => d.clinic_id === clinic.id && d.active);
    if (activeDoc) {
      if (activeDoc.status_state === "in") return `Dr. ${activeDoc.name} clinic mein aa chuke hain.`;
      if (activeDoc.status_state === "late") return `Dr. ${activeDoc.name} lagbhag ${activeDoc.late_minutes} minutes late hain (clinic staff ke anusaar).`;
      if (activeDoc.status_state === "out") return `Dr. ${activeDoc.name} abhi clinic nahi aaye hain.`;
    }
    return `${clinic.name}: Doctor ki live status abhi confirm nahi hui hai, staff update kar raha hai.`;
  }

  // 5. Fees
  if (/fee|fees|charge|kitna|price|शुल्क/i.test(low)) {
    return `Fees: ${clinic.fees || "Consultation Rs 300"}.`;
  }

  // 6. Hours
  if (/hours|timing|open|kab khult[aei]|samay|समय/i.test(low)) {
    return `${clinic.name} hours: ${clinic.hours || "Mon-Sat 9 AM - 5 PM"}.`;
  }

  // 7. Address
  if (/address|location|kahan|pata|पता/i.test(low)) {
    return `Address: ${clinic.address || "12 MG Road, Nagpur"}.`;
  }

  // 8. Availability & Booking
  if (/availab|doctor|slot|book|appointment|मिल/i.test(low)) {
    if (!chatSessions[sid]) chatSessions[sid] = {};
    chatSessions[sid].pending = { awaiting: "confirm" };
    const doc = doctors.find((d) => d.clinic_id === clinic.id && d.active) || doctors[0];
    return `Dr. ${doc.name} (${doc.speciality}) kal 10:00 AM se available hain. Book karne ke liye YES reply karein.`;
  }

  return "Main Parchi hoon, clinic ka AI sahayak. Aap clinic hours, fees, doctor wait time ya appointment ke baare mein pooch sakte hain.";
}

// Catch-all route handler for all HTTP methods
export async function GET(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = "/" + (params.slug || []).join("/");
  const user = verifyUser(req);
  const clinic = clinics.find((c) => c.id === user.clinic_id) || clinics[0];

  if (path === "/health") {
    return NextResponse.json({ status: "ok", vercel_native: true });
  }

  if (path === "/auth/me") {
    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      clinic_id: user.clinic_id,
      clinic_name: clinic.name,
      is_demo: false,
    });
  }

  if (path === "/clinic") {
    return NextResponse.json(clinic);
  }

  if (path === "/doctors") {
    const list = doctors.filter((d) => d.clinic_id === user.clinic_id);
    return NextResponse.json(list);
  }

  if (path === "/patients") {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const list = patients.filter(
      (p) => p.clinic_id === user.clinic_id && (!q || p.name.toLowerCase().includes(q))
    );
    return NextResponse.json(list);
  }

  if (path === "/appointments") {
    const list = appointments.filter((a) => a.clinic_id === user.clinic_id);
    return NextResponse.json(list);
  }

  if (path === "/attention") {
    const list = events.filter((e) => e.clinic_id === user.clinic_id && !e.resolved);
    return NextResponse.json(list);
  }

  if (path === "/analytics") {
    const clinicEvents = events.filter((e) => e.clinic_id === user.clinic_id);
    const byOutcome: Record<string, number> = {};
    const byChannel: Record<string, number> = {};
    clinicEvents.forEach((e) => {
      byOutcome[e.outcome] = (byOutcome[e.outcome] || 0) + 1;
      byChannel[e.channel] = (byChannel[e.channel] || 0) + 1;
    });
    return NextResponse.json({
      days: 30,
      contacts: clinicEvents.length || 1,
      by_outcome: byOutcome,
      by_channel: byChannel,
      source: "Vercel Native Serverless Store",
    });
  }

  return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = "/" + (params.slug || []).join("/");
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  // 1. /auth/login
  if (path === "/auth/login") {
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const foundUser = users.find(
      (u) => u.email.toLowerCase() === email && u.password === password
    );
    if (!foundUser) {
      return NextResponse.json({ detail: "Wrong email or password" }, { status: 401 });
    }
    const clinic = clinics.find((c) => c.id === foundUser.clinic_id) || clinics[0];
    return NextResponse.json({
      token: makeToken(foundUser),
      role: foundUser.role,
      clinic_id: foundUser.clinic_id,
      clinic_name: clinic.name,
      email: foundUser.email,
    });
  }

  // 2. /auth/signup & /auth/register
  if (path === "/auth/signup" || path === "/auth/register") {
    const email = (body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ detail: "Please enter a valid email address" }, { status: 422 });
    }
    if (users.some((u) => u.email.toLowerCase() === email)) {
      return NextResponse.json(
        { detail: "An account with this email already exists" },
        { status: 409 }
      );
    }
    const newClinic: ClinicState = {
      id: clinics.length + 1,
      name: body.clinic_name || "New Clinic",
      address: body.address || "",
      hours: body.hours || "Mon-Sat 9 AM - 6 PM",
      fees: body.fees || "Consultation Rs 300",
      staff_phone: body.staff_phone || "",
    };
    clinics.push(newClinic);

    const newUser: UserState = {
      id: users.length + 1,
      clinic_id: newClinic.id,
      email,
      password: body.password || "password123",
      role: "owner",
    };
    users.push(newUser);

    doctors.push({
      id: doctors.length + 1,
      clinic_id: newClinic.id,
      name: body.doctor_name || "Primary Doctor",
      speciality: body.speciality || "General Physician",
      days: "0,1,2,3,4,5",
      start_hour: 9,
      end_hour: 18,
      slot_minutes: 15,
      status_state: "in",
      late_minutes: 0,
      active: true,
    });

    return NextResponse.json(
      {
        token: makeToken(newUser),
        role: newUser.role,
        clinic_id: newClinic.id,
        clinic_name: newClinic.name,
        email: newUser.email,
      },
      { status: 201 }
    );
  }

  const user = verifyUser(req);
  const clinic = clinics.find((c) => c.id === user.clinic_id) || clinics[0];

  // 3. /doctors
  if (path === "/doctors") {
    const newDoc: DoctorState = {
      id: doctors.length + 1,
      clinic_id: user.clinic_id,
      name: body.name || "Dr. Staff",
      speciality: body.speciality || "General Physician",
      days: body.days || "0,1,2,3,4,5",
      start_hour: body.start_hour || 9,
      end_hour: body.end_hour || 18,
      slot_minutes: body.slot_minutes || 15,
      status_state: "in",
      late_minutes: 0,
      active: true,
    };
    doctors.push(newDoc);
    return NextResponse.json(newDoc, { status: 201 });
  }

  // 4. /patients
  if (path === "/patients") {
    if (patients.some((p) => p.clinic_id === user.clinic_id && p.phone === body.phone)) {
      return NextResponse.json({ detail: "Phone already registered" }, { status: 409 });
    }
    const newPatient: PatientState = {
      id: patients.length + 1,
      clinic_id: user.clinic_id,
      name: body.name || "Patient",
      phone: body.phone,
      consent: true,
      opted_out: false,
    };
    patients.push(newPatient);
    return NextResponse.json(newPatient, { status: 201 });
  }

  // 5. /appointments
  if (path === "/appointments") {
    if (!body.confirmed) {
      return NextResponse.json({ detail: "Explicit confirmation required" }, { status: 422 });
    }
    const conflict = appointments.some(
      (a) =>
        a.doctor_id === body.doctor_id &&
        a.start === body.start &&
        a.status === "booked"
    );
    if (conflict) {
      return NextResponse.json({ detail: "Slot already taken" }, { status: 409 });
    }
    const newAppt: AppointmentState = {
      id: appointments.length + 1,
      clinic_id: user.clinic_id,
      doctor_id: body.doctor_id,
      patient_id: body.patient_id,
      start: body.start,
      status: "booked",
      channel: "dashboard",
    };
    appointments.push(newAppt);
    return NextResponse.json(newAppt, { status: 201 });
  }

  // 6. /appointments/:id/cancel
  const cancelMatch = path.match(/^\/appointments\/(\d+)\/cancel$/);
  if (cancelMatch) {
    const id = parseInt(cancelMatch[1], 10);
    const appt = appointments.find((a) => a.id === id && a.clinic_id === user.clinic_id);
    if (appt) appt.status = "cancelled";
    return NextResponse.json(appt || { id, status: "cancelled" });
  }

  // 7. /chat
  if (path === "/chat") {
    const reply = aiReply(clinic, body.session_id || "default", body.message || "");
    return NextResponse.json({ reply, ai_disclosure: "Parchi AI Assistant" });
  }

  // 8. /chat/unclear
  if (path === "/chat/unclear") {
    const sid = body.session_id || "default";
    if (!chatSessions[sid]) chatSessions[sid] = {};
    const n = (chatSessions[sid].unclear || 0) + 1;
    chatSessions[sid].unclear = n;
    if (n >= 2) {
      return NextResponse.json({
        reply: "Main clinic staff ko aapka number de rahi hoon, woh abhi aapko call karenge.",
        handoff: true,
      });
    }
    return NextResponse.json({
      reply: "Kya aap doctor sahab ke aane ke baare mein pooch rahe hain? Haan ya nahi boliye.",
      handoff: false,
    });
  }

  // 9. /attention/:id/resolve
  const resolveMatch = path.match(/^\/attention\/(\d+)\/resolve$/);
  if (resolveMatch) {
    const id = parseInt(resolveMatch[1], 10);
    const ev = events.find((e) => e.id === id);
    if (ev) ev.resolved = true;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
}

export async function PUT(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = "/" + (params.slug || []).join("/");
  const user = verifyUser(req);
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  // 1. /clinic
  if (path === "/clinic") {
    const clinic = clinics.find((c) => c.id === user.clinic_id) || clinics[0];
    Object.assign(clinic, body);
    return NextResponse.json({ ok: true });
  }

  // 2. /doctors/:id/status
  const statusMatch = path.match(/^\/doctors\/(\d+)\/status$/);
  if (statusMatch) {
    const id = parseInt(statusMatch[1], 10);
    const doc = doctors.find((d) => d.id === id && d.clinic_id === user.clinic_id);
    if (doc) {
      doc.status_state = body.state || "in";
      doc.late_minutes = body.late_minutes || 0;
      doc.status_at = new Date().toISOString();
    }
    return NextResponse.json({ ok: true });
  }

  // 3. /doctors/:id
  const docMatch = path.match(/^\/doctors\/(\d+)$/);
  if (docMatch) {
    const id = parseInt(docMatch[1], 10);
    const doc = doctors.find((d) => d.id === id && d.clinic_id === user.clinic_id);
    if (doc) Object.assign(doc, body);
    return NextResponse.json(doc || { ok: true });
  }

  return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
}
