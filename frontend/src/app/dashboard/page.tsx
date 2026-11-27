"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  IconCross,
  IconClock,
  IconActivity,
  IconStethoscope,
  IconCalendar,
  IconMessageSquare,
  IconMic,
  IconSettings,
  IconLogOut,
  IconCheckCircle,
  IconAlertTriangle,
  IconSend,
  IconUser,
  IconPhone,
  IconShieldCheck,
  IconSmartphone,
  IconArrowRight,
  IconZap,
} from "@/components/icons";

const TABS = [
  { id: "Now", label: "Now", desc: "Live status & handoffs", icon: IconClock },
  { id: "Overview", label: "Overview", desc: "Activity & safety log", icon: IconActivity },
  { id: "Doctors", label: "Doctors", desc: "Roster & notes", icon: IconStethoscope },
  { id: "Appointments", label: "Appointments", desc: "Patients & slots", icon: IconCalendar },
  { id: "AI Receptionist", label: "AI Receptionist", desc: "Chat test console", icon: IconMessageSquare },
  { id: "Call Simulator", label: "Call Simulator", desc: "Voice call test", icon: IconMic },
  { id: "Settings", label: "Settings", desc: "Clinic, consent & rules", icon: IconSettings },
] as const;

type TabId = (typeof TABS)[number]["id"];

function useLoad<T>(path: string, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(Boolean(path));
  const reload = useCallback(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    api<T>(path)
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [path]);
  useEffect(reload, [reload, ...deps]);
  return { data, err, loading, reload };
}

function State({ loading, err, empty }: { loading: boolean; err: string; empty?: boolean }) {
  if (loading)
    return (
      <div className="flex items-center gap-2.5 text-[16px] text-[#3C5250] py-4">
        <span className="w-4 h-4 border-2 border-[var(--teal)] border-t-transparent rounded-full animate-spin shrink-0"></span>
        <span>Loading…</span>
      </div>
    );
  if (err)
    return (
      <div role="alert" className="flex items-center gap-2.5 text-[16px] text-[#7A1E15] bg-[#FDECEA] border-2 border-[var(--red)] p-3.5 rounded-2xl">
        <IconAlertTriangle className="w-5 h-5 text-[var(--red)] shrink-0" />
        <span>{err}</span>
      </div>
    );
  return empty ? (
    <p className="text-[#3C5250] text-[16px] py-3 bg-[#F5F8F7] border border-[#D4E2DF] rounded-2xl px-4">
      Nothing here yet.
    </p>
  ) : null;
}

function parseUtc(ts?: string | null): Date | null {
  if (!ts) return null;
  const hasTz = ts.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(ts);
  const d = new Date(hasTz ? ts : `${ts}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isStatusFresh(ts?: string | null): boolean {
  const d = parseUtc(ts);
  if (!d) return false;
  const diffMins = (Date.now() - d.getTime()) / 60000;
  return diffMins >= 0 && diffMins <= 30;
}

function Feedback({ msg }: { msg: { text: string; err?: boolean } | null }) {
  if (!msg) return null;
  return (
    <div
      role={msg.err ? "alert" : "status"}
      className={`flex items-center gap-2.5 text-[16px] p-3.5 rounded-2xl mt-3 font-medium ${
        msg.err
          ? "text-[#7A1E15] bg-[#FDECEA] border-2 border-[var(--red)]"
          : "text-[#14532D] bg-[#DCFCE7] border-2 border-[#166534]"
      }`}
    >
      {msg.err ? (
        <IconAlertTriangle className="w-5 h-5 text-[var(--red)] shrink-0" />
      ) : (
        <IconCheckCircle className="w-5 h-5 text-[#14532D] shrink-0" />
      )}
      <span>{msg.text}</span>
    </div>
  );
}

function Now() {
  const doc = useLoad<any[]>("/doctors");
  const att = useLoad<any[]>("/attention");
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);

  async function set(id: number, state: string, late = 0) {
    setMsg(null);
    try {
      await api(`/doctors/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ state, late_minutes: late }),
      });
      setMsg({ text: "Status updated. Parchi will now answer patients with this." });
      doc.reload();
    } catch (x: any) {
      setMsg({ text: x.message || "Failed to update status", err: true });
    }
  }

  async function nextToken(id: number) {
    setMsg(null);
    try {
      const res = await api(`/doctors/${id}/next-token`, { method: "POST" });
      setMsg({ text: `Token advanced to #${res.current_token || 1}. Patients will be told this.` });
      doc.reload();
    } catch (x: any) {
      setMsg({ text: x.message || "Failed to advance token", err: true });
    }
  }

  const activeDoctors = doc.data?.filter((d) => d.active) || [];
  const primaryDoc = activeDoctors[0];
  const openHandoffs = att.data?.length || 0;

  return (
    <div className="space-y-5">
      {/* Live Clinic KPI Strip */}
      <div className="grid sm:grid-cols-3 gap-3.5">
        <div className="bg-white border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[var(--teal)] border-2 border-[var(--ink)] text-white flex items-center justify-center shrink-0">
            <IconStethoscope className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[16px] text-[var(--ink)] font-bold">Active Doctors</p>
            <p className="text-[24px] font-extrabold text-[var(--ink)] font-heading leading-tight">
              {activeDoctors.length}
            </p>
          </div>
        </div>

        <div className="bg-white border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[var(--yellow)] border-2 border-[var(--ink)] text-[var(--ink)] flex items-center justify-center shrink-0">
            <IconZap className="w-6 h-6 text-[var(--ink)]" />
          </div>
          <div className="min-w-0">
            <p className="text-[16px] text-[var(--ink)] font-bold">Current Token</p>
            <p className="text-[24px] font-extrabold text-[var(--teal)] font-heading leading-tight">
              #{primaryDoc?.current_token || 0}
            </p>
          </div>
        </div>

        <div className="bg-white border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] rounded-2xl p-4 flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl border-2 border-[var(--ink)] flex items-center justify-center shrink-0 ${
              openHandoffs > 0 ? "bg-[var(--red)] text-white" : "bg-[#DCFCE7] text-[#14532D]"
            }`}
          >
            <IconAlertTriangle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[16px] text-[var(--ink)] font-bold">Open Handoffs</p>
            <p className="text-[24px] font-extrabold text-[var(--ink)] font-heading leading-tight">
              {openHandoffs}
            </p>
          </div>
        </div>
      </div>

      {/* Doctor Status Controls (Ticket Cards) */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b-2 border-[var(--ink)] pb-3.5">
          <div>
            <h2 className="font-bold text-[var(--ink)] text-xl font-heading flex items-center gap-2">
              <IconClock className="w-5 h-5 text-[var(--teal)] shrink-0" />
              <span>Doctor Live Status</span>
            </h2>
            <p className="text-[16px] text-[#3C5250] mt-0.5">
              One tap updates both voice callers and WhatsApp replies immediately.
            </p>
          </div>
          <Link href="/receptionist" className="btn2 text-[16px] flex items-center gap-2 shrink-0">
            <IconSmartphone className="w-4 h-4 shrink-0" />
            <span>360px Mobile Desk</span>
            <IconArrowRight className="w-4 h-4 shrink-0" />
          </Link>
        </div>

        <State loading={doc.loading} err={doc.err} empty={activeDoctors.length === 0} />

        <div className="space-y-4">
          {activeDoctors.map((d) => {
            const fresh = isStatusFresh(d.status_at);
            const stateLabel =
              d.status_state === "in"
                ? "Doctor In"
                : d.status_state === "late"
                ? `Running Late (+${d.late_minutes} min)`
                : d.status_state === "out"
                ? "Not In Today"
                : "Not Set";
            const stateBadgeCls =
              fresh && d.status_state === "in"
                ? "bg-[#DCFCE7] text-[#14532D]"
                : fresh && d.status_state === "out"
                ? "bg-[var(--red)] text-white"
                : "bg-[var(--yellow)] text-[var(--ink)]";

            return (
              <div key={d.id} className="ticket-card">
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="min-w-0">
                      <p className="text-[16px] text-[#3C5250] font-semibold">
                        {d.speciality || "General Physician"}
                      </p>
                      <h3 className="text-[20px] font-extrabold text-[var(--ink)] font-heading flex items-center gap-2 flex-wrap">
                        <IconStethoscope className="w-5 h-5 text-[var(--teal)] shrink-0" />
                        <span>Dr. {d.name}</span>
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[16px] font-bold px-3 py-1 rounded-full ${stateBadgeCls}`}>
                        {stateLabel}
                      </span>
                      <span
                        className={`text-[16px] font-bold px-3 py-1 rounded-full ${
                          fresh ? "bg-[#E4EFED] text-[var(--ink)]" : "bg-[#FFF8EB] text-[var(--ink)] border border-[#F4B73F]"
                        }`}
                      >
                        {fresh ? "Fresh (≤30m)" : "Unconfirmed (>30m)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notched Tear Row with Token & Action Controls */}
                <div className="ticket-notch-row px-4 sm:px-5 py-4 bg-[#F9FBFA] space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-[16px] font-semibold text-[#3C5250]">Current Token</p>
                      <p className="font-heading text-[28px] font-extrabold text-[var(--ink)] leading-none mt-1">
                        #{d.current_token || 0}
                      </p>
                    </div>
                    <button
                      className="btn text-[16px] px-5 flex items-center gap-2 font-bold"
                      onClick={() => nextToken(d.id)}
                    >
                      <IconZap className="w-4 h-4" />
                      Next Token #{(d.current_token || 0) + 1}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                    <button
                      className="btn text-[16px] px-4 flex items-center justify-center gap-2 !bg-[#166534] hover:!bg-[#14532D]"
                      onClick={() => set(d.id, "in")}
                    >
                      <IconCheckCircle className="w-4 h-4" />
                      <span>Doctor in</span>
                    </button>
                    <button
                      className="btn text-[16px] px-4 flex items-center justify-center gap-2 !bg-[var(--yellow)] !text-[var(--ink)] hover:brightness-95"
                      onClick={() => set(d.id, "late", 15)}
                    >
                      <IconClock className="w-4 h-4 text-[var(--ink)]" />
                      <span>Late +15 min</span>
                    </button>
                    <button
                      className="btn text-[16px] px-4 flex items-center justify-center gap-2 !bg-[var(--yellow)] !text-[var(--ink)] hover:brightness-95"
                      onClick={() => set(d.id, "late", 30)}
                    >
                      <IconClock className="w-4 h-4 text-[var(--ink)]" />
                      <span>Late +30 min</span>
                    </button>
                    <button
                      className="btn text-[16px] px-4 flex items-center justify-center gap-2 !bg-[var(--red)] hover:!bg-[#9E2E24]"
                      onClick={() => set(d.id, "out")}
                    >
                      <IconAlertTriangle className="w-4 h-4 text-white" />
                      <span>Not in today</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Feedback msg={msg} />
      </div>

      {/* Needs Attention & Staff Handoffs */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#D4E2DF] pb-3">
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="w-5 h-5 text-[var(--red)] shrink-0" />
            <h2 className="font-bold text-[var(--ink)] text-xl font-heading">
              Needs Attention & Staff Handoffs
            </h2>
          </div>
          <span className="text-[16px] font-bold px-3 py-1 rounded-full bg-[#E4EFED] text-[var(--ink)]">
            {openHandoffs} pending
          </span>
        </div>

        <State loading={att.loading} err={att.err} empty={att.data?.length === 0} />

        <div className="space-y-3">
          {att.data?.map((e) => {
            const isUrgent = e.outcome === "urgent";
            return (
              <div
                key={e.id}
                className={`rounded-2xl p-4 border-2 border-l-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isUrgent
                    ? "bg-[#FDECEA] border-[#F2B8B2] border-l-[var(--red)]"
                    : "bg-[#F5F8F7] border-[#C8DAD7] border-l-[var(--teal)]"
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isUrgent ? (
                      <span className="inline-flex items-center gap-1.5 text-[16px] font-bold bg-[var(--red)] text-white px-3 py-0.5 rounded-full">
                        <IconAlertTriangle className="w-4 h-4 text-white" />
                        URGENT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[16px] font-bold bg-[#E4EFED] text-[var(--ink)] px-3 py-0.5 rounded-full">
                        <IconPhone className="w-4 h-4 text-[var(--teal)]" />
                        HANDOFF
                      </span>
                    )}
                    <span className="font-bold text-[17px] text-[var(--ink)] capitalize">
                      {e.intent}
                    </span>
                    <span className="text-[16px] text-[#3C5250] font-medium">· via {e.channel}</span>
                  </div>
                  <p className="text-[16px] text-[var(--ink)] break-words">
                    {e.note || "Staff follow-up required"}
                  </p>
                </div>

                <button
                  className="btn2 text-[16px] px-4 flex items-center justify-center gap-2 shrink-0 bg-white"
                  onClick={async () => {
                    await api(`/attention/${e.id}/resolve`, { method: "POST" });
                    att.reload();
                  }}
                >
                  <IconCheckCircle className="w-4 h-4 text-[var(--teal)]" />
                  <span>Mark as Handled</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Overview() {
  const { data, err, loading } = useLoad<any>("/analytics");
  const safety = useLoad<any[]>("/safety-logs");

  const outcomeEntries = data ? Object.entries(data.by_outcome || {}) : [];
  const channelEntries = data ? Object.entries(data.by_channel || {}) : [];

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#D4E2DF] pb-3">
          <div className="flex items-center gap-2">
            <IconActivity className="w-5 h-5 text-[var(--teal)] shrink-0" />
            <h2 className="font-bold text-[var(--ink)] text-xl font-heading">Activity Summary (Last 30 days)</h2>
          </div>
          {data && (
            <span className="text-[16px] font-semibold px-3 py-1 rounded-full bg-[#E4EFED] text-[var(--ink)]">
              {data.source}
            </span>
          )}
        </div>

        <State loading={loading} err={err} />

        {data && (
          <div className="space-y-4">
            {/* Highlight Teal Hero Stat */}
            <div className="rounded-2xl bg-[var(--teal)] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[16px] font-semibold text-[#E4EFED]">Total Patient Contacts Handled</p>
                <p className="text-4xl font-extrabold text-white font-heading mt-1">{data.contacts}</p>
              </div>
              <div className="bg-white/15 border border-white/25 rounded-2xl px-4 py-3 text-[16px] text-white font-medium">
                Automated answers, bookings & triaged handoffs
              </div>
            </div>

            {/* Outcome & Channel Breakdown Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-[#F5F8F7] border border-[#C8DAD7] p-4 rounded-2xl space-y-2.5">
                <h3 className="text-[17px] font-bold text-[var(--ink)] font-heading">By Outcome</h3>
                {outcomeEntries.length === 0 ? (
                  <p className="text-[16px] text-[#3C5250]">No interactions recorded yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {outcomeEntries.map(([k, v]: [string, any]) => (
                      <div
                        key={k}
                        className="bg-white border border-[#C8DAD7] rounded-xl px-3.5 py-2 flex items-center gap-2"
                      >
                        <span className="text-[16px] font-semibold capitalize text-[#3C5250]">{k}</span>
                        <span className="text-[16px] font-extrabold text-[var(--teal)]">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#F5F8F7] border border-[#C8DAD7] p-4 rounded-2xl space-y-2.5">
                <h3 className="text-[17px] font-bold text-[var(--ink)] font-heading">By Channel</h3>
                {channelEntries.length === 0 ? (
                  <p className="text-[16px] text-[#3C5250]">No interactions recorded yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {channelEntries.map(([k, v]: [string, any]) => (
                      <div
                        key={k}
                        className="bg-white border border-[#C8DAD7] rounded-xl px-3.5 py-2 flex items-center gap-2"
                      >
                        <span className="text-[16px] font-semibold capitalize text-[#3C5250]">{k}</span>
                        <span className="text-[16px] font-extrabold text-[var(--teal)]">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pre-Model Safety Trigger Log */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-[#D4E2DF] pb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <IconShieldCheck className="w-5 h-5 text-[var(--teal)] shrink-0" />
            <h2 className="font-bold text-[var(--ink)] text-xl font-heading">Pre-Model Safety Trigger Log</h2>
          </div>
          <span className="text-[16px] font-bold px-3 py-1 rounded-full bg-[#E4EFED] text-[var(--ink)]">
            {safety.data?.length ?? 0} logged
          </span>
        </div>

        <State loading={safety.loading} err={safety.err} empty={safety.data?.length === 0} />

        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {safety.data?.slice(0, 15).map((s) => (
            <div
              key={s.id}
              className={`p-3.5 rounded-2xl border-2 text-[16px] flex items-start justify-between gap-3 flex-wrap ${
                s.category === "urgent" ? "bg-[#FDECEA] border-[var(--red)]" : "bg-[#FFFBEB] border-[#F4B73F]"
              }`}
            >
              <div className="min-w-0 space-y-1">
                <p className="font-bold text-[var(--ink)] flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[16px] uppercase ${
                      s.category === "urgent" ? "bg-[var(--red)] text-white" : "bg-[var(--yellow)] text-[var(--ink)]"
                    }`}
                  >
                    {s.category}
                  </span>
                  <span>{s.trigger_rule}</span>
                  <span className="text-[#3C5250] font-medium">· via {s.channel}</span>
                </p>
                <p className="text-[var(--ink)] break-words">{s.message_excerpt}</p>
              </div>
              <span className="shrink-0 font-mono text-[16px] px-3 py-1 rounded-lg bg-white border border-[#C8DAD7] text-[var(--ink)] font-semibold">
                {s.ai_skipped ? "AI skipped" : "checked"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Doctors() {
  const { data, err, loading, reload } = useLoad<any[]>("/doctors");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api("/doctors", { method: "POST", body: JSON.stringify({ name: name.trim() }) });
      setName("");
      setMsg({ text: "Doctor added to clinic." });
      reload();
    } catch (x: any) {
      setMsg({ text: x.message || "Could not add doctor", err: true });
    }
  }

  async function saveNote(d: any) {
    setMsg(null);
    try {
      await api(`/doctors/${d.id}`, { method: "PUT", body: JSON.stringify({ ...d, status_note: noteText.trim() }) });
      setEditingId(null);
      setMsg({ text: `Updated note for Dr. ${d.name}.` });
      reload();
    } catch (x: any) {
      setMsg({ text: x.message || "Could not update note", err: true });
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="card space-y-3">
        <div className="flex items-center gap-2 border-b border-[#D4E2DF] pb-2.5">
          <IconStethoscope className="w-5 h-5 text-[var(--teal)]" />
          <h2 className="font-bold text-[var(--ink)] text-xl font-heading">Clinic Doctors</h2>
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          <label className="flex-1 text-[16px] font-semibold text-[var(--ink)] min-w-[200px]">
            Add New Doctor
            <div className="relative mt-1.5">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3C5250]">
                <IconStethoscope className="w-5 h-5" />
              </span>
              <input
                className="inp pl-11"
                required
                minLength={2}
                placeholder="e.g. Dr. Rajesh Verma"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </label>
          <button className="btn flex items-center gap-2">
            <IconCross className="w-4 h-4" />
            <span>Add Doctor</span>
          </button>
        </div>
        <Feedback msg={msg} />
      </form>

      <State loading={loading} err={err} empty={data?.length === 0} />

      <div className="space-y-3">
        {data?.map((d) => (
          <div className="card space-y-3" key={d.id}>
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#E4EFED] flex items-center justify-center shrink-0">
                  <IconStethoscope className="w-6 h-6 text-[var(--teal)]" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-[19px] text-[var(--ink)] font-heading">Dr. {d.name}</h3>
                    <span className="text-[16px] font-bold px-2.5 py-0.5 rounded-full bg-[#E4EFED] text-[var(--ink)]">
                      Token #{d.current_token || 0}
                    </span>
                    {!d.active && (
                      <span className="text-[16px] font-bold px-2.5 py-0.5 rounded-full bg-[#FDECEA] text-[var(--red)]">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-[16px] text-[#3C5250]">
                    {d.speciality} · Hours {d.start_hour}:00–{d.end_hour}:00 · {d.slot_minutes || 15} min slots
                  </p>
                  <p className="text-[16px] text-[var(--ink)] font-medium">
                    Note: {d.status_note || "No delay reported"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn2 text-[16px] flex items-center gap-2 shrink-0"
                onClick={() => {
                  if (editingId === d.id) {
                    setEditingId(null);
                  } else {
                    setEditingId(d.id);
                    setNoteText(d.status_note || "");
                  }
                }}
              >
                <IconClock className="w-4 h-4" />
                <span>{editingId === d.id ? "Cancel" : "Update Note"}</span>
              </button>
            </div>

            {editingId === d.id && (
              <div className="flex gap-2.5 flex-wrap pt-3 border-t border-[#D4E2DF]">
                <input
                  className="inp flex-1 min-w-[200px]"
                  placeholder="e.g. Running 20 min late"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <button type="button" className="btn text-[16px]" onClick={() => saveNote(d)}>
                  Save Note
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Appointments() {
  const a = useLoad<any[]>("/appointments");
  const d = useLoad<any[]>("/doctors");
  const p = useLoad<any[]>("/patients");
  const [f, setF] = useState({ doctor_id: "", patient_id: "", start: "" });
  const [ok, setOk] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [np, setNp] = useState({ name: "", phone: "", consent: true, no_message: false });
  const [patMsg, setPatMsg] = useState<{ text: string; err?: boolean } | null>(null);

  async function addPatient(e: React.FormEvent) {
    e.preventDefault();
    setPatMsg(null);
    try {
      const created = await api<any>("/patients", {
        method: "POST",
        body: JSON.stringify({
          name: np.name.trim(),
          phone: np.phone.trim(),
          consent: np.consent,
          no_message: np.no_message,
        }),
      });
      setNp({ name: "", phone: "", consent: true, no_message: false });
      setShowAddPatient(false);
      setF((prev) => ({ ...prev, patient_id: String(created.id) }));
      setPatMsg({ text: `Added patient ${created.name}.` });
      p.reload();
    } catch (x: any) {
      setPatMsg({ text: x.message || "Could not register patient", err: true });
    }
  }

  async function book(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api("/appointments", {
        method: "POST",
        body: JSON.stringify({
          doctor_id: +f.doctor_id,
          patient_id: +f.patient_id,
          start: f.start,
          confirmed: ok,
        }),
      });
      setOk(false);
      a.reload();
      setMsg({ text: "Appointment confirmed and booked." });
    } catch (x: any) {
      setMsg({ text: x.message || "Booking failed", err: true });
    }
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[#D4E2DF] pb-3">
          <div className="flex items-center gap-2">
            <IconCalendar className="w-5 h-5 text-[var(--teal)] shrink-0" />
            <h2 className="font-bold text-[var(--ink)] text-xl font-heading">Book Confirmed Appointment</h2>
          </div>
          <button
            type="button"
            className="btn2 text-[16px] flex items-center gap-2"
            onClick={() => setShowAddPatient(!showAddPatient)}
          >
            <IconUser className="w-4 h-4" />
            <span>{showAddPatient ? "Close Add Patient" : "+ Quick Add Patient"}</span>
          </button>
        </div>

        {(showAddPatient || p.data?.length === 0) && (
          <form onSubmit={addPatient} className="bg-[#F5F8F7] border-2 border-[#C8DAD7] rounded-2xl p-4 grid sm:grid-cols-2 gap-3">
            <p className="sm:col-span-2 text-[16px] font-bold text-[var(--ink)] uppercase tracking-wider">
              Register Patient
            </p>
            <input
              className="inp"
              required
              minLength={2}
              placeholder="Patient full name"
              value={np.name}
              onChange={(e) => setNp({ ...np, name: e.target.value })}
            />
            <input
              className="inp"
              required
              pattern="[0-9]{10,13}"
              placeholder="Phone (10-13 digits)"
              value={np.phone}
              onChange={(e) => setNp({ ...np, phone: e.target.value.replace(/\D/g, "") })}
            />
            <label className="flex items-center gap-2.5 text-[16px] text-[var(--ink)] min-h-[48px] cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={np.consent}
                onChange={(e) => setNp({ ...np, consent: e.target.checked })}
              />
              <span>Consent to updates/reminders</span>
            </label>
            <label className="flex items-center gap-2.5 text-[16px] text-[var(--ink)] min-h-[48px] cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={np.no_message}
                onChange={(e) => setNp({ ...np, no_message: e.target.checked })}
              />
              <span>Do not message this number</span>
            </label>
            <button className="btn sm:col-span-2">Save Patient</button>
          </form>
        )}
        <Feedback msg={patMsg} />

        <form onSubmit={book} className="grid sm:grid-cols-2 gap-3.5 pt-1">
          <label className="text-[16px] font-semibold text-[var(--ink)]">
            Doctor
            <select
              className="inp mt-1.5"
              required
              value={f.doctor_id}
              onChange={(e) => setF({ ...f, doctor_id: e.target.value })}
            >
              <option value="">Select Doctor</option>
              {d.data
                ?.filter((x) => x.active)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    Dr. {x.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-[16px] font-semibold text-[var(--ink)]">
            Patient
            <select
              className="inp mt-1.5"
              required
              value={f.patient_id}
              onChange={(e) => setF({ ...f, patient_id: e.target.value })}
            >
              <option value="">Select Patient</option>
              {p.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.phone})
                </option>
              ))}
            </select>
          </label>
          <label className="text-[16px] font-semibold text-[var(--ink)]">
            Date & Time
            <input
              className="inp mt-1.5"
              type="datetime-local"
              required
              value={f.start}
              onChange={(e) => setF({ ...f, start: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2.5 text-[16px] text-[var(--ink)] self-end min-h-[56px] cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded text-[var(--teal)] shrink-0"
              checked={ok}
              onChange={(e) => setOk(e.target.checked)}
            />
            <span>Patient has explicitly confirmed this appointment</span>
          </label>
          <button className="btn sm:col-span-2 flex items-center justify-center gap-2" disabled={!ok}>
            <IconCalendar className="w-4 h-4" />
            <span>Book Confirmed Slot</span>
          </button>
          <div className="sm:col-span-2">
            <Feedback msg={msg} />
          </div>
        </form>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between border-b border-[#D4E2DF] pb-3 flex-wrap gap-2">
          <h2 className="font-bold text-[var(--ink)] text-xl font-heading">Booked & Recent Appointments</h2>
          <span className="text-[16px] font-bold px-3 py-1 rounded-full bg-[#E4EFED] text-[var(--ink)]">
            {a.data?.length ?? 0} total
          </span>
        </div>

        <State loading={a.loading} err={a.err} empty={a.data?.length === 0} />

        <div className="space-y-3">
          {a.data?.map((x) => (
            <div
              className="p-4 rounded-2xl border border-[#C8DAD7] bg-[#F5F8F7] flex justify-between items-center gap-3 flex-wrap"
              key={x.id}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-white border border-[#C8DAD7] flex items-center justify-center shrink-0">
                  <IconCalendar className="w-5 h-5 text-[var(--teal)]" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[17px] text-[var(--ink)] flex items-center gap-2 flex-wrap">
                    <span>#{x.id}</span>
                    <span>· {new Date(x.start).toLocaleString()}</span>
                    <span
                      className={`text-[16px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        x.status === "booked"
                          ? "bg-[#DCFCE7] text-[#14532D]"
                          : "bg-white border border-[#B8CCC9] text-[#3C5250]"
                      }`}
                    >
                      {x.status}
                    </span>
                  </p>
                  <p className="text-[16px] text-[#3C5250]">Booked via: {x.channel}</p>
                </div>
              </div>
              {x.status === "booked" && (
                <button
                  className="btn2 text-[16px] flex items-center gap-2 bg-white !text-[var(--red)] !border-[var(--red)] hover:!bg-[#FDECEA]"
                  onClick={async () => {
                    await api(`/appointments/${x.id}/cancel`, { method: "POST" });
                    a.reload();
                  }}
                >
                  <IconAlertTriangle className="w-4 h-4" />
                  <span>Cancel Slot</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chat() {
  const initialGreeting = {
    who: "ai",
    t: "Hello! I'm Parchi, your clinic's AI receptionist. Ask about clinic timings, fees, doctor availability, or booking a slot.",
  };
  const [msgs, setMsgs] = useState<{ who: string; t: string }[]>([initialGreeting]);
  const [t, setT] = useState("");
  const [sid, setSid] = useState(() => "web" + Math.random().toString(36).slice(2, 8));
  const [busy, setBusy] = useState(false);
  const [pn, setPn] = useState("Rahul Kumar");
  const [pp, setPp] = useState("9876543210");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [msgs, busy]);

  async function sendMessage(rawMsg: string) {
    const m = rawMsg.trim();
    if (!m || busy) return;
    setT("");
    setMsgs((x) => [...x, { who: "me", t: m }]);
    setBusy(true);
    try {
      const r = await api("/chat", {
        method: "POST",
        body: JSON.stringify({
          session_id: sid,
          message: m,
          patient_name: pn.trim() || undefined,
          patient_phone: pp.trim() || undefined,
        }),
      });
      setMsgs((x) => [...x, { who: "ai", t: r.reply }]);
    } catch (x: any) {
      setMsgs((y) => [
        ...y,
        { who: "ai", t: "Error: " + x.message + ". Please contact clinic staff." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    await sendMessage(t);
  }

  function quickTest(msg: string) {
    void sendMessage(msg);
  }

  function resetChat() {
    if (busy) return;
    setSid("web" + Math.random().toString(36).slice(2, 8));
    setMsgs([initialGreeting]);
    setT("");
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-[#D4E2DF] pb-3 flex-wrap">
        <div>
          <h2 className="font-bold text-[var(--ink)] text-xl font-heading flex items-center gap-2">
            <IconMessageSquare className="w-5 h-5 text-[var(--teal)] shrink-0" />
            <span>AI Receptionist Live Testing Console</span>
          </h2>
          <p className="text-[16px] text-[#3C5250] mt-0.5">
            Test Hindi, Hinglish, Marathi, or English replies and confirmed slot booking.
          </p>
        </div>
        <button type="button" onClick={resetChat} disabled={busy} className="btn2 text-[16px] px-4 shrink-0">
          New Chat
        </button>
      </div>

      {/* Caller Identity Row */}
      <div className="bg-[#F5F8F7] border border-[#C8DAD7] rounded-2xl p-3.5 grid sm:grid-cols-2 gap-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3C5250]">
            <IconUser className="w-5 h-5" />
          </span>
          <input
            aria-label="Patient name"
            className="inp pl-11"
            placeholder="Patient name (e.g. Rahul Kumar)"
            value={pn}
            onChange={(e) => setPn(e.target.value)}
          />
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3C5250]">
            <IconPhone className="w-5 h-5" />
          </span>
          <input
            aria-label="Patient phone"
            className="inp pl-11"
            placeholder="Phone e.g. 9876543210"
            value={pp}
            onChange={(e) => setPp(e.target.value)}
          />
        </div>
      </div>

      {/* Quick Test Prompt Pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          "Doctor aa gaye kya?",
          "Fees kitni hai?",
          "क्लिनिकची वेळ काय आहे?",
          "Doctor availability?",
          "Book tomorrow 11:00",
          "YES",
          "NO",
          "Bachche ko 102 bukhar hai",
          "Seene mein dard hai",
          "Do not message this number",
        ].map((promptText) => (
          <button
            key={promptText}
            type="button"
            disabled={busy}
            className="btn2 text-[16px] px-3.5 bg-[#E4EFED]/40 hover:bg-[#E4EFED]"
            onClick={() => quickTest(promptText)}
          >
            {promptText}
          </button>
        ))}
      </div>

      <div
        ref={logRef}
        className="space-y-3 max-h-96 overflow-auto p-4 bg-[var(--paper)] rounded-2xl border border-[#C8DAD7]"
        aria-live="polite"
      >
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.who === "me" ? "justify-end" : "justify-start"}`}>
            {m.who === "ai" && (
              <span className="w-9 h-9 rounded-xl bg-[var(--teal)] text-white flex items-center justify-center shrink-0 mt-1">
                <IconCross className="w-5 h-5 text-white" />
              </span>
            )}
            <p
              className={`rounded-2xl p-3.5 max-w-[85%] whitespace-pre-line text-[16px] ${
                m.who === "me"
                  ? "bg-[var(--teal)] text-white"
                  : "bg-white border border-[#C8DAD7] text-[var(--ink)] shadow-xs"
              }`}
            >
              {m.t}
            </p>
          </div>
        ))}
        {busy && (
          <div className="flex gap-2.5 justify-start">
            <span className="w-9 h-9 rounded-xl bg-[var(--teal)] text-white flex items-center justify-center shrink-0 mt-1">
              <IconCross className="w-5 h-5 text-white" />
            </span>
            <p className="rounded-2xl p-3.5 bg-white border border-[#C8DAD7] text-[#3C5250] text-[16px]">
              Parchi is replying…
            </p>
          </div>
        )}
      </div>

      <form onSubmit={send} className="flex flex-col sm:flex-row gap-2.5">
        <input
          aria-label="Message"
          className="inp"
          required
          maxLength={500}
          placeholder="Ask a question (e.g. fees kitni hai? doctor kab aayenge?)"
          value={t}
          onChange={(e) => setT(e.target.value)}
        />
        <button className="btn px-6 flex items-center justify-center gap-2 shrink-0" disabled={busy}>
          <IconSend className="w-4 h-4" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}

const PRESETS: [string, string][] = [
  ["Call 1 · doctor aaye?", "Doctor sahab aa gaye kya?"],
  [
    "Call 2 · bachche ko bukhar",
    "Mere 2 saal ke bachche ko 102 bukhar hai, abhi lana zaroori hai ya shaam tak ruk sakte hain?",
  ],
  ["Call 3 · report (Verma)", "Main Verma bol raha hoon, meri report aayi kya?"],
  [
    "Call 4 · Sharma ji ka beta",
    "Sharma ji ka beta bol raha hoon, doctor sahab ko bol dena paanch minute mein aa raha hoon",
  ],
  [
    "Call 5 · chest pain",
    "Follow-up ke liye shaam 6:30 baje book karna hai. Subah se seene mein thoda dard hai.",
  ],
  ["Call 6 · pharma rep", "I am a pharma rep, when is the doctor free to meet?"],
  ["Call 7 · message mat bhejna", "Mujhe visit chahiye. Is number pe message mat bhejna."],
  ["Marathi · वेळ काय आहे?", "आज क्लिनिकची वेळ काय आहे?"],
];

function Sim() {
  const [log, setLog] = useState<{ who: string; t: string; ms?: number }[]>([]);
  const [lang, setLang] = useState("hi-IN");
  const [sid, setSid] = useState(() => "sim" + Math.random().toString(36).slice(2, 8));
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState("");

  function speak(t: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(t);
    u.lang = lang;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  async function turn(text: string) {
    setLog((l) => [...l, { who: "caller", t: text }]);
    const t0 = performance.now();
    let filled = false;
    const filler = setTimeout(() => {
      filled = true;
      speak("Ek second, main dekh rahi hoon");
      setLog((l) => [...l, { who: "parchi", t: "(filler) Ek second, main dekh rahi hoon" }]);
    }, 1500);
    try {
      const r = await api("/chat", {
        method: "POST",
        body: JSON.stringify({ session_id: sid, message: text, channel: "voice" }),
      });
      clearTimeout(filler);
      const ms = Math.round(performance.now() - t0);
      setLog((l) => [...l, { who: "parchi", t: r.reply, ms }]);
      speak(r.reply);
      setNote(filled ? "Filler played (reply was slower than 1.5 s)" : "");
    } catch (e: any) {
      clearTimeout(filler);
      setLog((l) => [...l, { who: "parchi", t: "Network problem. Clinic staff will call you back." }]);
    }
  }

  async function unclear() {
    const r = await api("/chat/unclear", {
      method: "POST",
      body: JSON.stringify({ session_id: sid, message: "?" }),
    });
    setLog((l) => [...l, { who: "caller", t: "(unclear / noise)" }, { who: "parchi", t: r.reply }]);
    speak(r.reply);
  }

  function listen() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setNote("Speech recognition not supported in this browser (use Chrome). Use preset buttons below.");
      return;
    }
    const rec = new SR();
    rec.lang = lang;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => unclear();
    rec.onresult = (e: any) => {
      const x = e.results[0][0];
      if (!x.transcript.trim() || x.confidence < 0.5) unclear();
      else turn(x.transcript);
    };
    rec.start();
  }

  return (
    <div className="card space-y-4">
      <div className="rounded-2xl bg-[var(--ink)] text-white p-4 sm:p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-[var(--teal)] text-white flex items-center justify-center shrink-0">
            <IconMic className="w-6 h-6 text-white" />
          </span>
          <div>
            <h2 className="font-bold text-white text-xl font-heading">Inbound Call Speech Simulator</h2>
            <p className="text-[16px] text-[#E4EFED]">Measures speech-to-audio latency in your browser</p>
          </div>
        </div>
        <span className="text-[16px] font-bold bg-[#E4EFED] text-[var(--ink)] px-3.5 py-1.5 rounded-full">
          Voice Rule: &lt;2 sentences · no button prompts
        </span>
      </div>

      <div className="bg-[#F5F8F7] border border-[#C8DAD7] rounded-2xl p-3.5 flex gap-2.5 flex-wrap items-center">
        <label className="text-[16px] font-semibold text-[var(--ink)] flex items-center gap-2">
          <span>Language</span>
          <select className="inp w-auto" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="hi-IN">Hindi/Hinglish</option>
            <option value="en-IN">English</option>
            <option value="mr-IN">Marathi</option>
          </select>
        </label>
        <button className="btn text-[16px] flex items-center gap-2" onClick={listen}>
          <IconMic className="w-4 h-4" />
          <span>{listening ? "Listening…" : "Speak"}</span>
        </button>
        <button className="btn2 text-[16px] flex items-center gap-2 bg-white" onClick={unclear}>
          <IconAlertTriangle className="w-4 h-4 text-[var(--red)]" />
          <span>Simulate Noise</span>
        </button>
        <button className="btn2 text-[16px] bg-white" onClick={() => window.speechSynthesis?.cancel()}>
          Stop Audio
        </button>
        <button
          className="btn2 text-[16px] bg-white"
          onClick={() => {
            window.speechSynthesis?.cancel();
            setLog([]);
            setNote("");
            setSid("sim" + Math.random().toString(36).slice(2, 8));
          }}
        >
          Reset Call
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-[16px] font-bold text-[#3C5250]">Test Call Scenarios</p>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(([n, t]) => (
            <button key={n} className="btn2 text-[16px] px-4 bg-[#E4EFED]/40 hover:bg-[#E4EFED]" onClick={() => turn(t)}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {note && (
        <p role="status" className="text-[16px] text-[var(--teal)] font-semibold bg-[#E4EFED] px-4 py-2 rounded-xl">
          {note}
        </p>
      )}

      <div className="space-y-3 max-h-80 overflow-auto p-4 rounded-2xl bg-[var(--paper)] border border-[#C8DAD7]" aria-live="polite">
        {log.length === 0 && (
          <p className="text-[#3C5250] text-[16px]">
            Start a call simulation: click Speak or any scenario button above.
          </p>
        )}
        {log.map((m, i) => (
          <div key={i} className={`flex ${m.who === "caller" ? "justify-end" : "justify-start"}`}>
            <p
              className={`rounded-2xl p-3.5 w-fit max-w-[90%] whitespace-pre-line text-[16px] ${
                m.who === "caller"
                  ? "bg-[var(--teal)] text-white"
                  : "bg-white border border-[#C8DAD7] text-[var(--ink)]"
              }`}
            >
              {m.t}
              {m.ms !== undefined && (
                <span className="block text-[16px] font-semibold text-[#3C5250] mt-1">
                  reply in {m.ms} ms
                </span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Settings({ userRole }: { userRole?: string }) {
  const { data, err, loading, reload } = useLoad<any>("/clinic");
  const patients = useLoad<any[]>("/patients");
  const [f, setF] = useState<any>(null);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [purgeMsg, setPurgeMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [patMsg, setPatMsg] = useState<{ text: string; err?: boolean } | null>(null);

  const isOwner = userRole === "owner";
  const rulesData = useLoad<any>(isOwner ? "/rules/history" : "");
  const [ruleKey, setRuleKey] = useState("queue_priority");
  const [ruleVal, setRuleVal] = useState("elderly first");
  const [ruleMsg, setRuleMsg] = useState<{ text: string; err?: boolean } | null>(null);

  useEffect(() => {
    if (data) setF(data);
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api("/clinic", {
        method: "PUT",
        body: JSON.stringify({
          name: f.name || "",
          address: f.address || "",
          hours: f.hours || "",
          fees: f.fees || "",
          staff_phone: f.staff_phone || "",
          consent_line: f.consent_line || "",
          retention_days: Number(f.retention_days) || 90,
        }),
      });
      setMsg({ text: "Settings saved successfully." });
      reload();
    } catch (x: any) {
      setMsg({ text: x.message || "Failed to save settings", err: true });
    }
  }

  async function runPurge() {
    setPurgeMsg(null);
    try {
      const r = await api<any>("/admin/purge", { method: "POST" });
      setPurgeMsg({
        text: `Purged ${r.events_deleted} old event(s) older than ${r.retention_days ?? (f?.retention_days || 90)} days.`,
      });
    } catch (x: any) {
      setPurgeMsg({ text: x.message || "Failed to run purge", err: true });
    }
  }

  async function toggleNoMessage(p: any) {
    setPatMsg(null);
    try {
      const next = !p.no_message;
      await api(`/patients/${p.id}/no-message`, {
        method: "PUT",
        body: JSON.stringify({ no_message: next }),
      });
      setPatMsg({ text: `${p.name}: "Do not message this number" ${next ? "enabled" : "disabled"}.` });
      patients.reload();
    } catch (x: any) {
      setPatMsg({ text: x.message || "Failed to update preference", err: true });
    }
  }

  async function saveRule(e: React.FormEvent) {
    e.preventDefault();
    setRuleMsg(null);
    try {
      await api("/rules", {
        method: "POST",
        body: JSON.stringify({ rule_key: ruleKey, rule_value: ruleVal }),
      });
      setRuleMsg({ text: `Rule '${ruleKey}' saved and audited successfully.` });
      rulesData.reload();
    } catch (x: any) {
      setRuleMsg({ text: x.message || "Rule rejected", err: true });
    }
  }

  if (!f) return <State loading={loading} err={err} />;

  return (
    <div className="space-y-6">
      {/* Clinic Information */}
      <form onSubmit={save} className="card space-y-4">
        <div className="flex items-center gap-2 border-b border-[#D4E2DF] pb-3">
          <IconSettings className="w-5 h-5 text-[var(--teal)]" />
          <h2 className="font-bold text-[var(--ink)] text-xl font-heading">
            Clinic Information, Consent & Data Retention
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-3.5">
          {["name", "address", "hours", "fees", "staff_phone"].map((k) => (
            <label key={k} className="block text-[16px] font-semibold text-[var(--ink)] capitalize">
              {k.replace("_", " ")}
              <input
                className="inp mt-1.5"
                value={f[k] || ""}
                onChange={(e) => setF({ ...f, [k]: e.target.value })}
              />
            </label>
          ))}
        </div>

        <label className="block text-[16px] font-semibold text-[var(--ink)]">
          Patient Consent Line (DPDP & WhatsApp)
          <textarea
            className="inp mt-1.5 py-3 min-h-[84px]"
            maxLength={500}
            value={f.consent_line ?? ""}
            onChange={(e) => setF({ ...f, consent_line: e.target.value })}
            placeholder="By messaging or sharing your phone number, you consent to clinic updates and reminders (reply STOP to opt out)."
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-3.5 items-end">
          <label className="block text-[16px] font-semibold text-[var(--ink)]">
            Data Retention Period (Days — default 90)
            <input
              type="number"
              min={1}
              max={3650}
              className="inp mt-1.5"
              value={f.retention_days ?? 90}
              onChange={(e) => setF({ ...f, retention_days: Number(e.target.value) })}
            />
          </label>
          {isOwner && (
            <button type="button" onClick={runPurge} className="btn2 text-[16px] flex items-center justify-center gap-2">
              <IconClock className="w-4 h-4 text-[var(--teal)]" />
              <span>Purge Events Older Than {f.retention_days ?? 90} Days</span>
            </button>
          )}
        </div>
        <Feedback msg={purgeMsg} />

        <button className="btn flex items-center gap-2">
          <IconCheckCircle className="w-4 h-4" />
          <span>Save Information</span>
        </button>
        <Feedback msg={msg} />
      </form>

      {/* Per-Patient Messaging Consent */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 border-b border-[#D4E2DF] pb-3">
          <IconShieldCheck className="w-5 h-5 text-[var(--teal)] shrink-0" />
          <div>
            <h2 className="font-bold text-[var(--ink)] text-xl font-heading">
              Patient Messaging Consent (&ldquo;Do not message this number&rdquo;)
            </h2>
            <p className="text-[16px] text-[#3C5250]">Checked automatically before any WhatsApp reminder is sent</p>
          </div>
        </div>
        <State loading={patients.loading} err={patients.err} empty={patients.data?.length === 0} />
        <Feedback msg={patMsg} />
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {patients.data?.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F5F8F7] border border-[#C8DAD7] flex-wrap"
            >
              <div className="min-w-0">
                <p className="text-[17px] font-bold text-[var(--ink)] truncate">
                  {p.name} <span className="font-mono text-[16px] text-[#3C5250]">({p.phone})</span>
                </p>
                <p className="text-[16px] text-[#3C5250]">
                  Consent: <b>{p.consent ? "Yes" : "No"}</b> · Opted out: <b>{p.opted_out ? "Yes" : "No"}</b> · Do not
                  message:{" "}
                  <b className={p.no_message ? "text-[var(--red)]" : "text-[#14532D]"}>
                    {p.no_message ? "BLOCKED" : "Allowed"}
                  </b>
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleNoMessage(p)}
                className={`min-h-[48px] text-[16px] px-4 py-2 rounded-xl font-bold border-2 shrink-0 transition-colors ${
                  p.no_message
                    ? "bg-[#FDECEA] text-[var(--red)] border-[var(--red)] hover:bg-[#FAD4D0]"
                    : "bg-white text-[var(--ink)] border-[#B8CCC9] hover:bg-[#E4EFED]"
                }`}
              >
                {p.no_message ? "Allow Messages" : "Do Not Message"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Owner-Only Clinic Rules */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b border-[#D4E2DF] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <IconShieldCheck className="w-5 h-5 text-[var(--teal)] shrink-0" />
            <div>
              <h2 className="font-bold text-[var(--ink)] text-xl font-heading">Local Clinic Rules (Owner Only)</h2>
              <p className="text-[16px] text-[#3C5250]">Versioned, audited policies customized for this clinic</p>
            </div>
          </div>
          <span className="text-[16px] font-bold px-3 py-1 rounded-full bg-[#E4EFED] text-[var(--ink)]">
            {isOwner ? "Owner Access" : "Read-Only"}
          </span>
        </div>

        <div className="bg-[#FFFBEB] border-2 border-[#F4B73F] rounded-2xl p-4 text-[16px] text-[var(--ink)] flex items-start gap-2.5">
          <IconAlertTriangle className="w-5 h-5 text-[var(--red)] shrink-0 mt-0.5" />
          <div>
            <b>Hard Safety Boundary:</b> Local clinic rules can <i>never</i> override 112 emergency escalation, medical
            advice refusal, report identity disclosure checks, or safe-contact / opt-out preferences.
          </div>
        </div>

        {isOwner ? (
          <>
            <form onSubmit={saveRule} className="bg-[#F5F8F7] p-4 rounded-2xl border border-[#C8DAD7] space-y-3">
              <h3 className="text-[18px] font-bold text-[var(--ink)] font-heading">Add or Update Clinic Rule</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-[16px] font-semibold text-[var(--ink)]">
                  Rule Type
                  <select className="inp mt-1.5" value={ruleKey} onChange={(e) => setRuleKey(e.target.value)}>
                    <option value="queue_priority">Queue Priority (e.g., elderly first)</option>
                    <option value="hours">Custom Hours (e.g., Mon-Sat 8:00 AM - 8:00 PM)</option>
                    <option value="walkin_policy">Walk-in Policy</option>
                    <option value="custom_policy">Custom Policy</option>
                  </select>
                </label>
                <label className="text-[16px] font-semibold text-[var(--ink)]">
                  Rule Policy Text
                  <input
                    className="inp mt-1.5"
                    placeholder="e.g. elderly first"
                    value={ruleVal}
                    onChange={(e) => setRuleVal(e.target.value)}
                    required
                  />
                </label>
              </div>
              <button className="btn flex items-center gap-2">
                <IconCheckCircle className="w-4 h-4" />
                <span>Save Versioned Rule</span>
              </button>
              <Feedback msg={ruleMsg} />
            </form>

            <div className="space-y-2">
              <h3 className="text-[18px] font-bold text-[var(--ink)] font-heading">Active Rules</h3>
              {rulesData.data?.rules?.filter((r: any) => r.active).length === 0 ? (
                <p className="text-[16px] text-[#3C5250] italic">No custom rules active. Default clinic facts apply.</p>
              ) : (
                <div className="space-y-2">
                  {rulesData.data?.rules
                    ?.filter((r: any) => r.active)
                    .map((r: any) => (
                      <div
                        key={r.id}
                        className="p-3.5 bg-white border border-[#C8DAD7] rounded-xl flex items-center justify-between gap-2 flex-wrap"
                      >
                        <div>
                          <span className="text-[16px] font-bold font-mono uppercase bg-[#E4EFED] px-2.5 py-0.5 rounded text-[var(--ink)] mr-2">
                            {r.rule_key}
                          </span>
                          <span className="text-[16px] text-[var(--ink)] font-medium">{r.rule_value}</span>
                        </div>
                        <span className="text-[16px] text-[var(--teal)] font-bold px-2.5 py-0.5 rounded bg-[#E4EFED]">
                          v{r.version}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {rulesData.data?.audits?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#D4E2DF]">
                <h3 className="text-[16px] font-bold text-[#3C5250] uppercase tracking-wider">
                  Audit Log & Version History
                </h3>
                <div className="max-h-40 overflow-y-auto space-y-1.5 text-[16px] text-[var(--ink)] font-mono">
                  {rulesData.data.audits.map((a: any) => (
                    <div key={a.id} className="p-2.5 bg-[#F5F8F7] border border-[#D4E2DF] rounded-xl flex justify-between gap-2 flex-wrap">
                      <span>{a.action}</span>
                      <span className="text-[#3C5250]">{a.actor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-[16px] text-[#3C5250] italic">
            You are logged in as receptionist. Managing and versioning clinic rules requires owner role credentials.
          </p>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState<TabId>("Now");
  const [ready, setReady] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    if (!sessionStorage.getItem("token")) {
      window.location.href = "/login";
    } else {
      setReady(true);
      setClinicName(sessionStorage.getItem("clinic_name") || "My Clinic");
      setUserEmail(sessionStorage.getItem("email") || "");
      setUserRole(sessionStorage.getItem("role") || "");
      api("/auth/me")
        .then((u) => {
          if (u && u.clinic_name) {
            setClinicName(u.clinic_name);
            sessionStorage.setItem("clinic_name", u.clinic_name);
          }
          if (u && u.email) {
            setUserEmail(u.email);
            sessionStorage.setItem("email", u.email);
          }
          if (u && u.role) {
            setUserRole(u.role);
            sessionStorage.setItem("role", u.role);
          }
        })
        .catch(() => {});
      api("/clinic")
        .then((c) => {
          if (c && c.name) {
            setClinicName(c.name);
            sessionStorage.setItem("clinic_name", c.name);
          }
        })
        .catch(() => {});
    }
  }, []);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col">
      {/* Top Clinic Command Bar */}
      <header className="w-full bg-white border-b-2 border-[var(--ink)] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-xl bg-[var(--teal)] border-2 border-[var(--ink)] text-white flex items-center justify-center font-bold shrink-0">
              <IconCross className="w-6 h-6 text-white" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--ink)] leading-tight break-words font-heading">
                  {clinicName || "Parchi AI Clinic"}
                </h1>
                {userRole && (
                  <span className="text-[16px] font-bold uppercase tracking-wider bg-[var(--yellow)] border-2 border-[var(--ink)] text-[var(--ink)] px-3 py-0.5 rounded-lg shrink-0">
                    {userRole}
                  </span>
                )}
              </div>
              {userEmail && <p className="text-[16px] text-[var(--ink)] font-mono break-all">{userEmail}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
            <Link href="/receptionist" className="btn2 text-[16px] px-4 inline-flex items-center gap-2">
              <IconSmartphone className="w-4 h-4 shrink-0" />
              <span>Mobile Desk</span>
            </Link>
            <a
              href="/"
              className="min-h-[48px] text-[16px] text-[var(--ink)] hover:text-[var(--teal)] font-bold px-3 inline-flex items-center transition-colors"
            >
              Public Site
            </a>
            <button
              className="btn2 text-[16px] px-4 flex items-center gap-2 shrink-0"
              onClick={() => {
                sessionStorage.clear();
                window.location.href = "/login";
              }}
            >
              <IconLogOut className="w-4 h-4 text-[var(--ink)] shrink-0" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace: Left Sidebar Rail (Desktop) + Responsive Grid Tabs (Mobile) + Active Panel */}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-5 lg:py-7 flex flex-col lg:flex-row gap-6 items-start min-w-0 flex-1">
        <aside className="w-full lg:w-64 shrink-0 space-y-4 min-w-0">
          <nav
            className="w-full flex flex-wrap lg:flex-col gap-2 p-2.5 bg-white border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] rounded-2xl min-w-0"
            aria-label="Dashboard"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setTab(t.id)}
                  className={`min-h-[52px] px-3.5 py-2.5 rounded-xl text-left font-bold transition-all flex items-center gap-2.5 min-w-0 lg:w-full ${
                    isActive
                      ? "bg-[var(--teal)] text-white border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]"
                      : "text-[var(--ink)] border-2 border-transparent hover:bg-[#E4EFED] hover:border-[var(--ink)]"
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-[var(--teal)]"}`} />
                  <span className="text-[16px] whitespace-nowrap">{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Desktop Quick Desk Card */}
          <div className="hidden lg:block card p-4 space-y-3">
            <p className="text-[16px] font-bold text-[var(--ink)] font-heading">1-Tap Receptionist Phone</p>
            <p className="text-[16px] text-[var(--ink)]">
              Dedicated 360px screen with zero forms for front-desk staff.
            </p>
            <Link href="/receptionist" className="btn w-full text-[16px] gap-2">
              <IconSmartphone className="w-4 h-4 shrink-0" />
              <span>Open Desk View</span>
            </Link>
          </div>
        </aside>

        <main className="w-full flex-1 min-w-0">
          {tab === "Now" && <Now />}
          {tab === "Overview" && <Overview />}
          {tab === "Doctors" && <Doctors />}
          {tab === "Appointments" && <Appointments />}
          {tab === "AI Receptionist" && <Chat />}
          {tab === "Call Simulator" && <Sim />}
          {tab === "Settings" && <Settings userRole={userRole} />}
        </main>
      </div>
    </div>
  );
}
