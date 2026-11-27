"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  IconCross,
  IconRefreshCw,
  IconCheckCircle,
  IconAlertTriangle,
  IconClock,
  IconXCircle,
  IconPhone,
  IconZap,
} from "@/components/icons";
import { EmptyDeskIllustration } from "@/components/graphics";

interface Doctor {
  id: number;
  name: string;
  speciality: string;
  status_state: "in" | "late" | "out" | "unknown";
  late_minutes: number;
  current_token: number;
  status_at: string | null;
  active: boolean;
}

interface AttentionItem {
  id: number;
  outcome: string;
  intent: string;
  channel: string;
  note: string;
  at: string;
}

function parseUtcTimestamp(ts: string): Date {
  const hasTz = ts.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(ts);
  return new Date(hasTz ? ts : `${ts}Z`);
}

export default function ReceptionistPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [missedCalls, setMissedCalls] = useState<AttentionItem[]>([]);
  const [clinicName, setClinicName] = useState<string>("Clinic Desk");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadErr, setLoadErr] = useState<string>("");
  const [updating, setUpdating] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [nowTime, setNowTime] = useState<Date>(new Date());
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTimedMsg = useCallback((text: string, type: "success" | "error", ms = 3500) => {
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    setMsg({ text, type });
    msgTimerRef.current = setTimeout(() => setMsg(null), ms);
  }, []);

  useEffect(() => {
    return () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("token")) {
      router.replace("/login");
      return;
    }
    try {
      setLoading(true);
      setLoadErr("");
      const [me, docs, att] = await Promise.all([
        api("/auth/me"),
        api<Doctor[]>("/doctors"),
        api<AttentionItem[]>("/attention").catch(() => [] as AttentionItem[]),
      ]);
      if (me && me.clinic_name) setClinicName(me.clinic_name);
      setDoctors(docs.filter((d) => d.active));
      setMissedCalls(Array.isArray(att) ? att : []);
    } catch (err: any) {
      const m = err?.message || "Failed to load clinic status.";
      if (/auth|401|token|unknown user/i.test(m)) {
        sessionStorage.clear();
        router.replace("/login");
        return;
      }
      setLoadErr(m);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeDoc = doctors[0] || null;

  let isFresh = false;
  let timeAgoText = "Not updated yet";
  if (activeDoc && activeDoc.status_at) {
    const updatedAt = parseUtcTimestamp(activeDoc.status_at);
    const diffMins = Math.max(0, Math.floor((nowTime.getTime() - updatedAt.getTime()) / (1000 * 60)));
    isFresh = !Number.isNaN(diffMins) && diffMins <= 30;
    if (Number.isNaN(diffMins)) {
      timeAgoText = "Unknown";
    } else if (diffMins < 1) {
      timeAgoText = "Just now";
    } else if (diffMins === 1) {
      timeAgoText = "1 min ago";
    } else if (diffMins < 60) {
      timeAgoText = `${diffMins} min ago`;
    } else {
      timeAgoText = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m ago`;
    }
  }

  let statusLabel = "Unconfirmed";
  let estWaitLabel = "Unconfirmed";
  let statusBadgeClass = "bg-[#F4B73F] text-[#1F2D2C]";
  if (activeDoc && isFresh) {
    if (activeDoc.status_state === "in") {
      statusLabel = "Doctor aa gaye";
      estWaitLabel = "0 min";
      statusBadgeClass = "bg-[#0F6B66] text-white";
    } else if (activeDoc.status_state === "late") {
      statusLabel = `${activeDoc.late_minutes || 15} min late`;
      estWaitLabel = `~${activeDoc.late_minutes || 15} min`;
      statusBadgeClass = "bg-[#F4B73F] text-[#1F2D2C]";
    } else if (activeDoc.status_state === "out") {
      statusLabel = "Aaj nahi hain";
      estWaitLabel = "Not today";
      statusBadgeClass = "bg-[#C23B2E] text-white";
    }
  }

  const setStatus = async (state: "in" | "late" | "out", lateMinutes = 0) => {
    if (!activeDoc || updating) return;
    setUpdating(true);
    try {
      const res = await api(`/doctors/${activeDoc.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ state, late_minutes: lateMinutes }),
      });
      setDoctors((prev) =>
        prev.map((d) =>
          d.id === activeDoc.id
            ? {
              ...d,
              status_state: state,
              late_minutes: lateMinutes,
              status_at: res?.status_at || new Date().toISOString(),
            }
            : d
        )
      );
      setNowTime(new Date());
      showTimedMsg(
        state === "in"
          ? "Updated: Doctor aa gaye"
          : state === "late"
            ? "Updated: 15 min late"
            : "Updated: Aaj nahi hain",
        "success"
      );
    } catch (err: any) {
      showTimedMsg(err.message || "Update failed", "error");
    } finally {
      setUpdating(false);
    }
  };

  const nextToken = async () => {
    if (!activeDoc || updating) return;
    setUpdating(true);
    try {
      const updated = await api(`/doctors/${activeDoc.id}/next-token`, {
        method: "POST",
      });
      setDoctors((prev) =>
        prev.map((d) => (d.id === activeDoc.id ? { ...d, current_token: updated.current_token } : d))
      );
      showTimedMsg(`Token #${updated.current_token}`, "success");
    } catch (err: any) {
      showTimedMsg(err.message || "Token update failed", "error");
    } finally {
      setUpdating(false);
    }
  };

  const resolveMissedCall = async (id: number) => {
    try {
      await api(`/attention/${id}/resolve`, { method: "POST" });
      setMissedCalls((prev) => prev.filter((item) => item.id !== id));
      showTimedMsg("Marked called back", "success");
    } catch (err: any) {
      showTimedMsg(err.message || "Could not update item", "error");
    }
  };

  return (
    <main className="min-h-screen text-[var(--ink)] w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-5">
      {/* Responsive Header with Back to Dashboard Link */}
      <header className="flex items-center justify-between gap-3 bg-white border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-10 h-10 rounded-lg bg-[var(--teal)] border-2 border-[var(--ink)] text-white flex items-center justify-center shrink-0">
            <IconCross className="w-5 h-5 text-white" />
          </span>
          <div className="min-w-0">
            <h1 className="font-heading text-[18px] sm:text-[20px] font-extrabold text-[var(--ink)] truncate">
              {clinicName}
            </h1>
            <p className="text-[14px] text-[#4F6865] hidden sm:block">Reception Desk Live Status</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard"
            className="btn2 text-[16px] min-h-[48px] px-3.5 inline-flex items-center gap-1.5"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={loadData}
            aria-label="Refresh status"
            className="min-w-[48px] min-h-[48px] inline-flex items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[#FFF8E6] text-[var(--ink)] shadow-[2px_2px_0_var(--ink)] hover:bg-[#E4F2F0]"
          >
            <IconRefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Error / Loading states */}
      {loading && !activeDoc && (
        <div className="ticket-card p-5 text-[17px] font-semibold text-center">
          Loading clinic status…
        </div>
      )}

      {loadErr && (
        <div role="alert" className="rounded-2xl bg-[var(--red)] text-white p-4 space-y-3">
          <p className="text-[17px] font-bold">{loadErr}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadData}
              className="flex-1 min-h-[56px] rounded-xl bg-white text-[var(--ink)] font-bold text-[16px]"
            >
              Retry
            </button>
            <Link
              href="/login"
              className="flex-1 min-h-[56px] inline-flex items-center justify-center rounded-xl border-2 border-white text-white font-bold text-[16px]"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}

      {/* TOP: Ticket-Shaped Status Card (Notched Edges) */}
      {activeDoc && (
        <section aria-label="Doctor live ticket status" className="ticket-card">
          <div className="ticket-ribbon">
            <span className="font-heading text-[16px] font-extrabold uppercase tracking-wide text-white">
              Live Token Parchi
            </span>
            <span className={`px-3 py-0.5 rounded-full border-2 border-[var(--ink)] text-[16px] font-bold shrink-0 ${statusBadgeClass}`}>
              {statusLabel}
            </span>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-[16px] font-semibold text-[#2F4442]">Consulting Doctor</p>
              <h2 className="font-heading text-[22px] sm:text-[26px] font-extrabold text-[var(--ink)] leading-tight break-words">
                Dr. {activeDoc.name}
              </h2>
              <p className="text-[16px] text-[#4F6865] mt-1">{activeDoc.speciality || "General Physician"}</p>
            </div>

            <div className="flex flex-col justify-center space-y-1.5 text-[16px] text-[#2F4442] bg-[var(--paper)] sm:bg-transparent rounded-xl p-3 sm:p-0 border sm:border-0 border-[var(--ink)]/15">
              <div className="flex items-center justify-between">
                <span>Estimated wait</span>
                <span className="font-bold text-[var(--ink)]">{estWaitLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last confirmed</span>
                <span className="font-semibold text-[var(--ink)]">{timeAgoText}</span>
              </div>
            </div>
          </div>

          {/* Perforated Notched Tear Section with Token Number */}
          <div className="ticket-notch-row px-4 sm:px-6 py-4 bg-[#E4F2F0] flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div>
              <p className="text-[16px] font-bold text-[#2F4442]">Current token</p>
              <p className="font-heading text-[34px] sm:text-[42px] font-extrabold leading-none text-[var(--ink)] mt-1">
                #<span key={activeDoc.current_token} className="animate-token">{activeDoc.current_token || 0}</span>
              </p>
            </div>
            <button
              type="button"
              disabled={updating}
              onClick={nextToken}
              className="btn min-h-[56px] px-6 text-[17px] gap-2 shrink-0"
            >
              <IconZap className="w-5 h-5 shrink-0" />
              <span>Next Token</span>
            </button>
          </div>
        </section>
      )}

      {/* Live Feedback Toast */}
      {msg && (
        <div
          role="status"
          className={`rounded-2xl px-4 py-3 text-[17px] font-bold flex items-center gap-2 ${msg.type === "success" ? "bg-[var(--teal)] text-white" : "bg-[var(--red)] text-white"
            }`}
        >
          {msg.type === "success" ? (
            <IconCheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <IconAlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* MIDDLE: Responsive One-Tap Buttons */}
      <section aria-label="One-tap doctor status controls" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          disabled={updating || !activeDoc}
          onClick={() => setStatus("in", 0)}
          className={`w-full min-h-[56px] px-4 rounded-xl border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] text-[18px] font-bold flex items-center justify-between transition-all disabled:opacity-50 ${activeDoc?.status_state === "in" && isFresh
            ? "bg-[var(--teal)] text-white"
            : "bg-white text-[var(--ink)] hover:bg-[#E4EFED]"
            }`}
        >
          <span className="flex items-center gap-3">
            <IconCheckCircle className="w-6 h-6 shrink-0" />
            <span>Doctor in</span>
          </span>
          <span className="text-[16px] font-bold px-2 py-0.5 rounded bg-[var(--paper)]/30 border border-current">Tap</span>
        </button>

        <button
          type="button"
          disabled={updating || !activeDoc}
          onClick={() => setStatus("late", 15)}
          className={`w-full min-h-[56px] px-4 rounded-xl border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] text-[18px] font-bold flex items-center justify-between transition-all disabled:opacity-50 ${activeDoc?.status_state === "late" && isFresh
            ? "bg-[var(--yellow)] text-[var(--ink)]"
            : "bg-white text-[var(--ink)] hover:bg-[#FEF9EC]"
            }`}
        >
          <span className="flex items-center gap-3">
            <IconClock className="w-6 h-6 shrink-0" />
            <span>15 min late</span>
          </span>
          <span className="text-[16px] font-bold px-2 py-0.5 rounded bg-[var(--paper)]/30 border border-current">Tap</span>
        </button>

        <button
          type="button"
          disabled={updating || !activeDoc}
          onClick={() => setStatus("out", 0)}
          className={`w-full min-h-[56px] px-4 rounded-xl border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] text-[18px] font-bold flex items-center justify-between transition-all disabled:opacity-50 ${activeDoc?.status_state === "out" && isFresh
            ? "bg-[var(--red)] text-white"
            : "bg-white text-[var(--ink)] hover:bg-[#FDF2F1]"
            }`}
        >
          <span className="flex items-center gap-3">
            <IconXCircle className="w-6 h-6 shrink-0" />
            <span>Not in today</span>
          </span>
          <span className="text-[16px] font-bold px-2 py-0.5 rounded bg-[var(--paper)]/30 border border-current">Tap</span>
        </button>
      </section>

      {/* BOTTOM: Missed Calls List */}
      <section aria-label="Missed calls" className="card p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 border-b-2 border-[var(--ink)] pb-3">
          <h2 className="font-heading text-[20px] font-extrabold text-[var(--ink)] flex items-center gap-2">
            <IconPhone className="w-5 h-5 text-[var(--teal)] shrink-0" />
            <span>Missed calls & callbacks</span>
          </h2>
          <span className="px-3 py-0.5 rounded-lg bg-[var(--yellow)] border-2 border-[var(--ink)] text-[var(--ink)] text-[16px] font-bold">
            {missedCalls.length}
          </span>
        </div>

        {missedCalls.length === 0 ? (
          <EmptyDeskIllustration
            title="All caught up!"
            subtitle="No missed calls waiting right now."
          />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {missedCalls.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl p-4 border-2 border-[var(--ink)] flex flex-col justify-between gap-3 ${
                  item.outcome === "urgent" ? "bg-[#FDECEA]" : "bg-[var(--paper)]"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg border-2 border-[var(--ink)] text-[16px] font-bold uppercase ${
                        item.outcome === "urgent"
                          ? "bg-[var(--red)] text-white"
                          : "bg-[var(--yellow)] text-[var(--ink)]"
                      }`}
                    >
                      {item.outcome === "urgent" ? "Urgent" : "Callback"}
                    </span>
                    <span className="text-[16px] font-bold text-[var(--ink)]">{item.channel}</span>
                  </div>
                  <p className="text-[17px] text-[var(--ink)] leading-snug">{item.note || "Patient requested callback"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => resolveMissedCall(item.id)}
                  className="btn2 w-full min-h-[52px] text-[17px]"
                >
                  Mark called back
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
