"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconClock,
  IconPhone,
  IconRefreshCw,
  IconSend,
  IconShieldCheck,
  IconStethoscope,
} from "@/components/icons";
import { sendChatMessage } from "@/lib/api";

interface DemoMessage {
  who: "patient" | "assistant";
  text: string;
}

interface TicketState {
  doctorName: string;
  statusLabel: string;
  statusTone: "teal" | "yellow" | "red";
  token: number;
  estWait: string;
  confirmedAgo: string;
}

const EMERGENCY_RE =
  /chest pain|seene mein dard|breathless|can'?t breathe|cannot breathe|saans|child.*fever|bachche.*bukhar|high fever|103|104/i;

const INITIAL_MESSAGES: DemoMessage[] = [
  {
    who: "assistant",
    text: "Namaste! I am Parchi, the clinic's automated assistant. Ask 'Doctor aaye kya?', check fees, or test an urgent symptom.",
  },
];

const INITIAL_TICKET: TicketState = {
  doctorName: "Dr. Neha Sharma",
  statusLabel: "Unconfirmed",
  statusTone: "yellow",
  token: 12,
  estWait: "Tap Send to check",
  confirmedAgo: "Waiting for query",
};

export default function HeroDemo() {
  const [input, setInput] = useState("Doctor aaye kya?");
  const [messages, setMessages] = useState<DemoMessage[]>(INITIAL_MESSAGES);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [ticket, setTicket] = useState<TicketState>(INITIAL_TICKET);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, emergencyActive]);

  async function processMessage(raw: string) {
    const text = raw.trim();
    if (!text) return;
    setInput("");

    if (EMERGENCY_RE.test(text)) {
      setEmergencyActive(true);
      setMessages((prev) => [
        ...prev,
        { who: "patient", text },
        {
          who: "assistant",
          text: "🚨 EMERGENCY: Please go to the nearest emergency room or call 112 immediately. Clinic staff have been alerted.",
        },
      ]);
      setTicket((prev) => ({
        ...prev,
        statusLabel: "Call 112",
        statusTone: "red",
        estWait: "Call 112 now",
        confirmedAgo: "Emergency gate triggered",
      }));
      // Also notify backend safety triage in background
      sendChatMessage({ message: text }).catch(() => { });
      return;
    }

    setEmergencyActive(false);
    setMessages((prev) => [...prev, { who: "patient", text }]);

    try {
      const res = await sendChatMessage({ message: text });
      const reply = res.reply || "Thank you. Front desk has noted your query.";
      const isUrgent = res.outcome === "urgent";

      if (isUrgent) {
        setEmergencyActive(true);
        setTicket((prev) => ({
          ...prev,
          statusLabel: "Staff Alerted",
          statusTone: "red",
          estWait: "Call 112 now",
          confirmedAgo: "Emergency gate triggered",
        }));
        return;
      }

      // Update live status ticket based on classified intent
      if (res.intent === "fees" || /fee|payment|upi|gpay|cash/i.test(text)) {
        setTicket({
          doctorName: res.doctor_name || "Dr. Neha Sharma",
          statusLabel: "Rs 300 · Cash/UPI",
          statusTone: "teal",
          token: 14,
          estWait: "Consultation open",
          confirmedAgo: "Verified fees & UPI",
        });
      } else if (res.intent === "hours" || /timing|hours|open|samay|vel/i.test(text)) {
        setTicket({
          doctorName: res.doctor_name || "Dr. Neha Sharma",
          statusLabel: "OPD Open",
          statusTone: "teal",
          token: 14,
          estWait: "Mon–Sat 9–7",
          confirmedAgo: "Verified OPD hours",
        });
      } else if (res.intent === "address" || /address|kahan|location|pata/i.test(text)) {
        setTicket({
          doctorName: res.doctor_name || "Dr. Neha Sharma",
          statusLabel: "12 MG Road",
          statusTone: "teal",
          token: 14,
          estWait: "Landmark: Opp. Metro",
          confirmedAgo: "Verified location",
        });
      } else if (res.intent === "services" || /service|facility|checkup|test|bp|sugar/i.test(text)) {
        setTicket({
          doctorName: res.doctor_name || "Dr. Neha Sharma",
          statusLabel: "Checkup & OPD",
          statusTone: "teal",
          token: 14,
          estWait: "Routine & BP Tests",
          confirmedAgo: "Verified services",
        });
      } else if (res.intent === "wait" || /doctor|aaye|late|wait/i.test(text)) {
        const isLate = reply.includes("late") || res.doctor_status === "late";
        setTicket({
          doctorName: res.doctor_name || "Dr. Neha Sharma",
          statusLabel: isLate ? "15 min late" : "Doctor In",
          statusTone: isLate ? "yellow" : "teal",
          token: 14,
          estWait: isLate ? "~15 min" : "~5 min",
          confirmedAgo: "Live status synced",
        });
      } else {
        setTicket({
          doctorName: res.doctor_name || "Dr. Neha Sharma",
          statusLabel: "Desk Active",
          statusTone: "teal",
          token: 14,
          estWait: "Instant response",
          confirmedAgo: "Live status synced",
        });
      }

      setMessages((prev) => [...prev, { who: "assistant", text: reply }]);
    } catch {
      // Graceful local fallback
      if (/fee|fees|timing|hours|open|vel|band|address/i.test(text)) {
        setTicket({
          doctorName: "Dr. Neha Sharma",
          statusLabel: "Doctor In",
          statusTone: "teal",
          token: 14,
          estWait: "Mon–Sat 9–7",
          confirmedAgo: "Clinic facts verified",
        });
        setMessages((prev) => [
          ...prev,
          {
            who: "assistant",
            text: "Clinic hours are Mon–Sat, 9 AM to 7 PM. Consultation fee is Rs 300. Ask 'Doctor aaye kya?' for live doctor wait updates.",
          },
        ]);
      } else if (/doctor|aaye|late|wait|kitna|token|\bin\b/i.test(text)) {
        setTicket({
          doctorName: "Dr. Neha Sharma",
          statusLabel: "15 min late",
          statusTone: "yellow",
          token: 14,
          estWait: "~15 min",
          confirmedAgo: "Confirmed 4 min ago",
        });
        setMessages((prev) => [
          ...prev,
          {
            who: "assistant",
            text: "Dr. Neha Sharma is on duty (status confirmed by clinic). Current token is #14, estimated wait ~15 min.",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            who: "assistant",
            text: "I am Parchi, the clinic's automated assistant. Ask 'Doctor aaye kya?' for live wait updates or 'Clinic fees?' for clinic details.",
          },
        ]);
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    processMessage(input);
  }

  function resetDemo() {
    setEmergencyActive(false);
    setInput("Doctor aaye kya?");
    setMessages(INITIAL_MESSAGES);
    setTicket(INITIAL_TICKET);
  }

  const badgeStyle =
    ticket.statusTone === "teal"
      ? "bg-[var(--teal)] text-white"
      : ticket.statusTone === "red"
        ? "bg-[var(--red)] text-white"
        : "bg-[var(--yellow)] text-[var(--ink)]";

  return (
    <div id="live-demo" className="grid lg:grid-cols-12 gap-6 items-start">
      {/* Left: Interactive Patient Chat Demo */}
      <div className="lg:col-span-7 ticket-card">
        <div className="ticket-ribbon flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-heading text-[18px] font-extrabold text-white flex items-center gap-2">
              <IconCheckCircle className="w-5 h-5 text-[var(--yellow)] shrink-0" />
              <span>Live Patient Chat Demo</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-[var(--yellow)] border-2 border-[var(--ink)] text-[var(--ink)] text-[16px] font-bold">
              Automated Assistant
            </span>
          </div>
          <button
            type="button"
            onClick={resetDemo}
            className="btn2 !min-h-[48px] px-3.5 text-[16px] gap-1.5"
            aria-label="Reset live demo"
          >
            <IconRefreshCw className="w-4 h-4 shrink-0" />
            <span>Reset</span>
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Full Red Emergency Panel (no AI-generated text) */}
          {emergencyActive ? (
            <div
              role="alert"
              className="rounded-xl bg-[var(--red)] border-2 border-[var(--ink)] text-white p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <IconAlertTriangle className="w-8 h-8 text-white shrink-0" />
                <h2 className="font-heading text-[22px] font-extrabold text-white">
                  Medical Emergency Detected
                </h2>
              </div>
              <p className="text-[18px] font-bold leading-snug text-white">
                Go to the nearest emergency room or call 112 immediately. Clinic staff have been alerted.
              </p>
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <a
                  href="tel:112"
                  className="btn !bg-white !text-[var(--red)] border-2 border-[var(--ink)] font-extrabold text-[17px] px-5 py-2.5 inline-flex items-center gap-2 hover:bg-[#FEE] shadow-[2px_2px_0_var(--ink)]"
                >
                  <IconPhone className="w-5 h-5 shrink-0" />
                  <span>Call 112 Now</span>
                </a>
                <button
                  type="button"
                  onClick={resetDemo}
                  className="btn2 w-full sm:w-auto px-5"
                >
                  Reset Live Demo
                </button>
              </div>
            </div>
          ) : (
            <div
              ref={feedRef}
              className="space-y-3 max-h-72 overflow-y-auto p-3.5 bg-[#FFF8E6] border-2 border-[var(--ink)] rounded-xl"
              aria-live="polite"
            >
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl p-3.5 max-w-[92%] text-[17px] border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] ${m.who === "patient"
                    ? "bg-[var(--teal)] text-white ml-auto"
                    : "bg-white text-[var(--ink)]"
                    }`}
                >
                  <p>{m.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Quick Demo Scenario Chips */}
          <div className="space-y-2">
            <p className="text-[16px] font-bold text-[var(--ink)]">Try a scenario in 1 tap:</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => processMessage("Doctor aaye kya?")}
                className="btn2 min-h-[52px] px-4 text-[16px]"
              >
                Doctor aaye kya?
              </button>
              <button
                type="button"
                onClick={() => processMessage("Clinic timing & fees?")}
                className="btn2 min-h-[52px] px-4 text-[16px]"
              >
                Timing &amp; fees?
              </button>
              <button
                type="button"
                onClick={() => processMessage("Consultation fees kitni hai aur UPI chalega?")}
                className="btn2 min-h-[52px] px-4 text-[16px]"
              >
                Fees &amp; UPI?
              </button>
              <button
                type="button"
                onClick={() => processMessage("Clinic kahan par hai aur landmark kya hai?")}
                className="btn2 min-h-[52px] px-4 text-[16px]"
              >
                Address &amp; map?
              </button>
              <button
                type="button"
                onClick={() => processMessage("Chest pain and breathlessness")}
                className="btn min-h-[52px] px-4 text-[16px] !bg-[var(--red)] hover:!bg-[#9E2E24]"
              >
                Chest pain
              </button>
              <button
                type="button"
                onClick={() => processMessage("Child has high fever 103")}
                className="btn min-h-[52px] px-4 text-[16px] !bg-[var(--red)] hover:!bg-[#9E2E24]"
              >
                Child&apos;s high fever
              </button>
            </div>
          </div>

          {/* Chat Input Form */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <input
              aria-label="Ask clinic assistant"
              className="inp flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type 'Doctor aaye kya?'..."
            />
            <button type="submit" className="btn gap-2 shrink-0 px-6">
              <IconSend className="w-5 h-5 shrink-0" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Right: Ticket-Shaped Live Status Card + Workflow Strip */}
      <div className="lg:col-span-5 space-y-4">
        <div className="ticket-card">
          <div className="ticket-ribbon">
            <span className="font-heading text-[16px] font-extrabold tracking-wide uppercase text-white">
              Clinic Live Parchi
            </span>
            <span className={`px-3 py-0.5 rounded-full border-2 border-[var(--ink)] text-[16px] font-bold shrink-0 ${badgeStyle}`}>
              {ticket.statusLabel}
            </span>
          </div>

          <div className="p-5 space-y-3.5">
            <div className="min-w-0">
              <h2 className="font-heading text-[22px] font-extrabold text-[var(--ink)] flex items-center gap-2">
                <IconStethoscope className="w-5 h-5 text-[var(--teal)] shrink-0" />
                <span>{ticket.doctorName}</span>
              </h2>
            </div>

            <div className="flex items-center justify-between text-[17px]">
              <span className="text-[#2F4442] flex items-center gap-1.5 font-medium">
                <IconClock className="w-5 h-5 text-[var(--teal)] shrink-0" />
                Estimated wait
              </span>
              <span className="font-bold text-[var(--ink)]">{ticket.estWait}</span>
            </div>

            <div className="flex items-center justify-between text-[16px]">
              <span className="text-[#2F4442] font-medium">Source</span>
              <span className="font-semibold text-[var(--ink)]">{ticket.confirmedAgo}</span>
            </div>
          </div>

          <div className="ticket-notch-row px-5 py-4 bg-[#E4F2F0] flex items-center justify-between">
            <div>
              <p className="text-[16px] font-bold text-[#2F4442]">Current Token</p>
              <p className="font-heading text-[34px] font-extrabold text-[var(--ink)] leading-none mt-1">
                #<span key={ticket.token} className="animate-token">{ticket.token}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[16px] font-bold bg-white border-2 border-[var(--ink)] rounded-xl px-3 py-1.5 text-[var(--teal)]">
              <IconShieldCheck className="w-5 h-5 shrink-0" />
              <span>Verified</span>
            </div>
          </div>
        </div>

        {/* Plain-English How It Works Box */}
        <div className="card-teal space-y-1.5">
          <p className="font-heading text-[18px] font-extrabold text-[var(--ink)]">How patients get answered</p>
          <p className="text-[16px] text-[var(--ink)] leading-relaxed">
            1. Receptionist taps doctor status on mobile &rarr; 2. Parchi shares verified wait time &amp; token &rarr; 3. Red-flag symptoms bypass AI and route straight to 112.
          </p>
        </div>
      </div>
    </div>
  );
}
