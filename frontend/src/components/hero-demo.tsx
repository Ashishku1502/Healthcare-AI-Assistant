"use client";

import { useState } from "react";
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconClock,
  IconSend,
  IconShieldCheck,
} from "@/components/icons";

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

export default function HeroDemo() {
  const [input, setInput] = useState("Doctor aaye kya?");
  const [messages, setMessages] = useState<DemoMessage[]>([
    {
      who: "assistant",
      text: "Namaste! I am Parchi, the clinic's automated assistant. Ask 'Doctor aaye kya?' or test an urgent symptom.",
    },
  ]);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [ticket, setTicket] = useState<TicketState>({
    doctorName: "Dr. Neha Sharma",
    statusLabel: "Unconfirmed",
    statusTone: "yellow",
    token: 12,
    estWait: "Tap Send to check",
    confirmedAgo: "Waiting for query",
  });

  function processMessage(raw: string) {
    const text = raw.trim();
    if (!text) return;
    setInput("");

    if (EMERGENCY_RE.test(text)) {
      setEmergencyActive(true);
      setMessages((prev) => [...prev, { who: "patient", text }]);
      setTicket((prev) => ({
        ...prev,
        statusLabel: "Staff Alerted",
        statusTone: "red",
        estWait: "Call 112 now",
        confirmedAgo: "Emergency gate triggered",
      }));
      return;
    }

    setEmergencyActive(false);

    if (/doctor|aaye|late|wait|kitna|token|in/i.test(text)) {
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
        { who: "patient", text },
        {
          who: "assistant",
          text: "Dr. Neha Sharma is 15 min late (confirmed by clinic 4 min ago). Current token is #14, estimated wait ~15 min.",
        },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      { who: "patient", text },
      {
        who: "assistant",
        text: "Clinic hours are Mon–Sat, 9 AM to 7 PM. Fees: Rs 300. Ask 'Doctor aaye kya?' for live wait updates.",
      },
    ]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    processMessage(input);
  }

  function resetDemo() {
    setEmergencyActive(false);
    setInput("Doctor aaye kya?");
    setMessages([
      {
        who: "assistant",
        text: "Namaste! I am Parchi, the clinic's automated assistant. Ask 'Doctor aaye kya?' or test an urgent symptom.",
      },
    ]);
    setTicket({
      doctorName: "Dr. Neha Sharma",
      statusLabel: "Unconfirmed",
      statusTone: "yellow",
      token: 12,
      estWait: "Tap Send to check",
      confirmedAgo: "Waiting for query",
    });
  }

  const badgeStyle =
    ticket.statusTone === "teal"
      ? "bg-[var(--teal)] text-white"
      : ticket.statusTone === "red"
      ? "bg-[var(--red)] text-white"
      : "bg-[var(--yellow)] text-[var(--ink)]";

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start">
      {/* Left: Interactive Chat Demo */}
      <div className="lg:col-span-7 bg-white border-2 border-[#C8DAD7] rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-[#D4E2DF] pb-3 flex-wrap">
          <span className="font-heading text-[18px] font-bold text-[var(--ink)] flex items-center gap-2">
            <IconCheckCircle className="w-5 h-5 text-[var(--teal)] shrink-0" />
            <span>Live Patient Chat Demo</span>
          </span>
          <span className="px-3 py-1 rounded-full bg-[#E4EFED] text-[var(--ink)] text-[16px] font-semibold">
            Automated Assistant
          </span>
        </div>

        {/* Full Red Emergency Panel (no AI-generated text) */}
        {emergencyActive ? (
          <div
            role="alert"
            className="rounded-2xl bg-[var(--red)] text-white p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <IconAlertTriangle className="w-7 h-7 text-white shrink-0" />
              <h2 className="font-heading text-[22px] font-extrabold text-white">
                Medical Emergency Detected
              </h2>
            </div>
            <p className="text-[18px] font-bold leading-snug text-white">
              Go to the nearest emergency room or call 112 immediately. Clinic staff have been alerted.
            </p>
            <button
              type="button"
              onClick={resetDemo}
              className="w-full sm:w-auto min-h-[56px] px-5 rounded-2xl bg-white text-[var(--ink)] font-bold text-[17px] hover:bg-[#F5F8F7]"
            >
              Reset Live Demo
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1" aria-live="polite">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-3.5 max-w-[92%] text-[17px] ${
                  m.who === "patient"
                    ? "bg-[var(--teal)] text-white ml-auto"
                    : "bg-[#E4EFED] text-[var(--ink)]"
                }`}
              >
                <p>{m.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick Demo Triggers */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => processMessage("Doctor aaye kya?")}
            className="btn2 min-h-[56px] px-4 text-[16px]"
          >
            Doctor aaye kya?
          </button>
          <button
            type="button"
            onClick={() => processMessage("Chest pain and breathlessness")}
            className="min-h-[56px] px-4 rounded-2xl border-2 border-[var(--red)] bg-white text-[var(--ink)] font-bold text-[16px] hover:bg-[#FDF2F1]"
          >
            Chest pain
          </button>
          <button
            type="button"
            onClick={() => processMessage("Child has high fever 103")}
            className="min-h-[56px] px-4 rounded-2xl border-2 border-[var(--red)] bg-white text-[var(--ink)] font-bold text-[16px] hover:bg-[#FDF2F1]"
          >
            Child&apos;s high fever
          </button>
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
          <button type="submit" className="btn gap-2 shrink-0">
            <IconSend className="w-5 h-5 shrink-0" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* Right: Ticket-Shaped Live Status Card updated by chat */}
      <div className="lg:col-span-5">
        <div className="ticket-card">
          <div className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[16px] font-semibold text-[#3C5250]">Clinic Live Ticket</p>
                <h2 className="font-heading text-[22px] font-extrabold text-[var(--ink)]">
                  {ticket.doctorName}
                </h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-[16px] font-bold shrink-0 ${badgeStyle}`}>
                {ticket.statusLabel}
              </span>
            </div>

            <div className="flex items-center justify-between text-[17px]">
              <span className="text-[#3C5250] flex items-center gap-1.5">
                <IconClock className="w-5 h-5 text-[var(--teal)] shrink-0" />
                Estimated wait
              </span>
              <span className="font-bold text-[var(--ink)]">{ticket.estWait}</span>
            </div>

            <div className="flex items-center justify-between text-[16px]">
              <span className="text-[#3C5250]">Source</span>
              <span className="font-semibold text-[var(--ink)]">{ticket.confirmedAgo}</span>
            </div>
          </div>

          <div className="ticket-notch-row px-5 py-4 bg-[#F9FBFA] flex items-center justify-between">
            <div>
              <p className="text-[16px] font-semibold text-[#3C5250]">Current Token</p>
              <p className="font-heading text-[34px] font-extrabold text-[var(--ink)] leading-none mt-1">
                #<span key={ticket.token} className="animate-token">{ticket.token}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[16px] font-semibold text-[var(--teal)]">
              <IconShieldCheck className="w-5 h-5 shrink-0" />
              <span>Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
