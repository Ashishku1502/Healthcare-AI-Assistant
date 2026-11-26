"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

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

function parseUtcTimestamp(ts: string): Date {
  const hasTz = ts.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(ts);
  return new Date(hasTz ? ts : `${ts}Z`);
}

export default function ReceptionistPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [clinicName, setClinicName] = useState<string>("Clinic Front Desk");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadErr, setLoadErr] = useState<string>("");
  const [updating, setUpdating] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [nowTime, setNowTime] = useState<Date>(new Date());

  // Keep live elapsed time updated every 15 seconds
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
      const me = await api("/auth/me");
      if (me && me.clinic_name) setClinicName(me.clinic_name);

      const docs: Doctor[] = await api("/doctors");
      const activeDocs = docs.filter((d) => d.active);
      setDoctors(activeDocs);
      setSelectedDocId((prev) => (prev && activeDocs.some((d) => d.id === prev) ? prev : activeDocs[0]?.id ?? null));
    } catch (err: any) {
      const m = err?.message || "Failed to load clinic status.";
      if (m.toLowerCase().includes("auth") || m.toLowerCase().includes("401")) {
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

  const activeDoc = doctors.find((d) => d.id === selectedDocId) || doctors[0] || null;

  // Calculate staleness (30 min threshold) using UTC-normalized timestamp
  let isFresh = false;
  let timeAgoText = "Never updated";
  if (activeDoc && activeDoc.status_at) {
    const updatedAt = parseUtcTimestamp(activeDoc.status_at);
    const diffMins = Math.max(0, Math.floor((nowTime.getTime() - updatedAt.getTime()) / (1000 * 60)));
    isFresh = !Number.isNaN(diffMins) && diffMins <= 30;
    if (Number.isNaN(diffMins)) {
      timeAgoText = "Unknown";
    } else if (diffMins < 1) {
      timeAgoText = "Just now (<1 min ago)";
    } else if (diffMins === 1) {
      timeAgoText = "1 min ago";
    } else if (diffMins < 60) {
      timeAgoText = `${diffMins} mins ago`;
    } else {
      timeAgoText = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m ago`;
    }
  }

  const setStatus = async (state: "in" | "late" | "out", lateMinutes: number = 0) => {
    if (!activeDoc || updating) return;
    setUpdating(true);
    setMsg(null);
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
      setMsg({
        text: `✓ Live state updated: ${state === "in" ? "Doctor In" : state === "late" ? `Running Late +${lateMinutes}m` : "Not In Today"}`,
        type: "success",
      });
    } catch (err: any) {
      setMsg({ text: err.message || "Failed to update status", type: "error" });
    } finally {
      setUpdating(false);
      setTimeout(() => setMsg(null), 4000);
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
      setMsg({ text: `✓ Advanced to Token #${updated.current_token}`, type: "success" });
    } catch (err: any) {
      setMsg({ text: err.message || "Failed to advance token", type: "error" });
    } finally {
      setUpdating(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col justify-between max-w-md mx-auto shadow-2xl border-x border-slate-200">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3.5 sticky top-0 z-10 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            Receptionist Desk · Mobile View
          </span>
          <h1 className="text-base font-bold text-slate-900 truncate">
            {clinicName}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadData}
            title="Refresh"
            aria-label="Refresh doctor status"
            className="p-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-50"
          >
            <svg className={`w-5 h-5 ${loading ? "animate-spin text-indigo-600" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg whitespace-nowrap"
          >
            Dashboard →
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <div className="p-4 flex-1 flex flex-col gap-4">
        {/* Loading / Error / Empty states */}
        {loading && doctors.length === 0 && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-sm text-slate-600 flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            Loading clinic schedule…
          </div>
        )}

        {loadErr && (
          <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs space-y-2">
            <p className="font-bold">Could not load doctors</p>
            <p>{loadErr}</p>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={loadData} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold">
                Retry
              </button>
              <Link href="/login" className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-800 font-semibold">
                Sign In
              </Link>
            </div>
          </div>
        )}

        {!loading && !loadErr && doctors.length === 0 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 text-center text-sm text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800">No active doctors found.</p>
            <Link href="/dashboard" className="inline-block text-xs font-bold text-indigo-600 hover:underline">
              Add a doctor in Dashboard →
            </Link>
          </div>
        )}

        {/* Doctor Switcher if multiple */}
        {doctors.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {doctors.map((d) => (
              <button
                type="button"
                key={d.id}
                onClick={() => setSelectedDocId(d.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
                  activeDoc?.id === d.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                Dr. {d.name}
              </button>
            ))}
          </div>
        )}

        {/* Doctor Identity & Live Status Card */}
        {activeDoc && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">Consulting Doctor</p>
                <h2 className="text-xl font-black text-slate-900 tracking-tight truncate">
                  Dr. {activeDoc.name}
                </h2>
                <p className="text-xs text-slate-500">{activeDoc.speciality}</p>
              </div>

              {/* Status Badge */}
              <div className="text-right shrink-0">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${
                    activeDoc.status_state === "in"
                      ? "bg-emerald-100 text-emerald-800"
                      : activeDoc.status_state === "late"
                      ? "bg-amber-100 text-amber-800"
                      : activeDoc.status_state === "out"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeDoc.status_state === "in"
                        ? "bg-emerald-500 animate-pulse"
                        : activeDoc.status_state === "late"
                        ? "bg-amber-500"
                        : activeDoc.status_state === "out"
                        ? "bg-rose-500"
                        : "bg-slate-400"
                    }`}
                  />
                  {activeDoc.status_state === "in"
                    ? "Doctor In"
                    : activeDoc.status_state === "late"
                    ? `Late (+${activeDoc.late_minutes}m)`
                    : activeDoc.status_state === "out"
                    ? "Not In Today"
                    : "Not Set"}
                </span>
              </div>
            </div>

            {/* Freshness / Staleness Alert */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Live Timestamp:</span>
              <span className="font-medium text-slate-700 font-mono">{timeAgoText}</span>
            </div>

            <div className="mt-2">
              {isFresh ? (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Fresh (&le;30 min): Parchi is answering callers from this live state.</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Unconfirmed (&gt;30 mins): Tap a button below to confirm live timing.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feedback message banner */}
        {msg && (
          <div
            role="status"
            className={`text-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              msg.type === "success"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                : "bg-rose-600 text-white shadow-md shadow-rose-200"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* THE 3 ONE-TAP BUTTONS (Mobile Phone First) */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Doctor Status · One-Tap Live Update
          </p>

          {/* Button 1: Doctor in */}
          <button
            type="button"
            disabled={updating || !activeDoc}
            onClick={() => setStatus("in", 0)}
            className={`w-full py-4 px-5 rounded-2xl font-black text-base flex items-center justify-between text-left transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 ${
              activeDoc?.status_state === "in" && isFresh
                ? "bg-emerald-600 text-white ring-4 ring-emerald-200 shadow-emerald-100"
                : "bg-white text-emerald-700 border-2 border-emerald-500 hover:bg-emerald-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
                ✓
              </span>
              <div>
                <div className="text-base font-black">Doctor in</div>
                <div className="text-xs font-normal opacity-80">Doctor arrived, sessions running</div>
              </div>
            </div>
            <span className="text-xs uppercase font-bold bg-black/10 px-2.5 py-1 rounded-full shrink-0">
              Tap 1
            </span>
          </button>

          {/* Button 2: Running late +15 min */}
          <button
            type="button"
            disabled={updating || !activeDoc}
            onClick={() => setStatus("late", 15)}
            className={`w-full py-4 px-5 rounded-2xl font-black text-base flex items-center justify-between text-left transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 ${
              activeDoc?.status_state === "late" && activeDoc.late_minutes === 15 && isFresh
                ? "bg-amber-500 text-white ring-4 ring-amber-200 shadow-amber-100"
                : "bg-white text-amber-800 border-2 border-amber-400 hover:bg-amber-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg shrink-0">
                +15
              </span>
              <div>
                <div className="text-base font-black">Running late +15 min</div>
                <div className="text-xs font-normal opacity-80">Delayed ~15m, answers wait callers</div>
              </div>
            </div>
            <span className="text-xs uppercase font-bold bg-black/10 px-2.5 py-1 rounded-full shrink-0">
              Tap 2
            </span>
          </button>

          {/* Button 3: Not in today */}
          <button
            type="button"
            disabled={updating || !activeDoc}
            onClick={() => setStatus("out", 0)}
            className={`w-full py-4 px-5 rounded-2xl font-black text-base flex items-center justify-between text-left transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 ${
              activeDoc?.status_state === "out" && isFresh
                ? "bg-rose-600 text-white ring-4 ring-rose-200 shadow-rose-100"
                : "bg-white text-rose-700 border-2 border-rose-400 hover:bg-rose-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg shrink-0">
                ✕
              </span>
              <div>
                <div className="text-base font-black">Not in today</div>
                <div className="text-xs font-normal opacity-80">Doctor absent, offers reschedule</div>
              </div>
            </div>
            <span className="text-xs uppercase font-bold bg-black/10 px-2.5 py-1 rounded-full shrink-0">
              Tap 3
            </span>
          </button>
        </div>

        {/* Current Token Counter & Next Token (+1) */}
        {activeDoc && (
          <div className="bg-indigo-900 text-white rounded-2xl p-4 shadow-md mt-1">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider">
                  Live Queue Token
                </p>
                <div className="text-3xl font-black font-mono">
                  #{activeDoc.current_token || 0}
                </div>
              </div>
              <button
                type="button"
                disabled={updating}
                onClick={nextToken}
                className="bg-indigo-500 hover:bg-indigo-400 active:scale-95 disabled:opacity-50 text-white font-bold px-4 py-3 rounded-xl text-sm flex items-center gap-2 shadow-lg transition-all"
              >
                <span>Next Token</span>
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                  #{(activeDoc.current_token || 0) + 1}
                </span>
              </button>
            </div>
            <p className="text-[11px] text-indigo-200">
              When callers ask &quot;kitna wait hai&quot; or share their token, Parchi calculates wait time from this live counter.
            </p>
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <footer className="bg-white border-t border-slate-200 p-3 text-center text-xs text-slate-500">
        <p>Parchi AI Receptionist · Designed for 1 Android Phone</p>
      </footer>
    </main>
  );
}
