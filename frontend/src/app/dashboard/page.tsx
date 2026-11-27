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
} from "@/components/icons";

const TABS = [
  { id: "Now", label: "Now", icon: IconClock },
  { id: "Overview", label: "Overview", icon: IconActivity },
  { id: "Doctors", label: "Doctors", icon: IconStethoscope },
  { id: "Appointments", label: "Appointments", icon: IconCalendar },
  { id: "AI Receptionist", label: "AI Receptionist", icon: IconMessageSquare },
  { id: "Call Simulator", label: "Call Simulator", icon: IconMic },
  { id: "Settings", label: "Settings", icon: IconSettings },
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
      <div className="flex items-center gap-2 text-[16px] text-[#3C5250] py-3">
        <span className="w-4 h-4 border-2 border-[var(--teal)] border-t-transparent rounded-full animate-spin"></span>
        Loading…
      </div>
    );
  if (err)
    return (
      <div role="alert" className="flex items-center gap-2 text-[16px] text-[#7A1E15] bg-[#FDECEA] border border-[var(--red)] p-3 rounded-xl">
        <IconAlertTriangle className="w-5 h-5 text-[var(--red)] shrink-0" />
        <span>{err}</span>
      </div>
    );
  return empty ? <p className="text-[#3C5250] text-[16px] py-2">Nothing here yet.</p> : null;
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
      className={`flex items-center gap-2 text-[16px] p-3 rounded-xl mt-2 ${
        msg.err ? "text-[#7A1E15] bg-[#FDECEA] border border-[var(--red)]" : "text-[#14532D] bg-[#DCFCE7] border border-[#166534]"
      }`}
    >
      {msg.err ? <IconAlertTriangle className="w-5 h-5 text-[var(--red)] shrink-0" /> : <IconCheckCircle className="w-5 h-5 text-[#14532D] shrink-0" />}
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

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <IconClock className="w-5 h-5 text-[var(--teal)]" />
            <h2 className="font-bold text-[var(--ink)] text-xl font-heading">Doctor status (tap once, ~5 seconds)</h2>
          </div>
          <Link
            href="/receptionist"
            className="btn2 text-[16px] flex items-center gap-2"
          >
            <IconSmartphone className="w-4 h-4 shrink-0" />
            <span>Mobile Receptionist View (1 Phone)</span>
            <IconArrowRight className="w-4 h-4 shrink-0" />
          </Link>
        </div>
        <State loading={doc.loading} err={doc.err} empty={doc.data?.length === 0} />
        {doc.data
          ?.filter((d) => d.active)
          .map((d) => (
            <div key={d.id} className="mb-4 bg-[#E4EFED]/40 p-4 rounded-2xl border border-[#C8DAD7]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="font-semibold text-[var(--ink)] text-[17px] flex items-center gap-2 flex-wrap">
                  <IconStethoscope className="w-5 h-5 text-[var(--teal)] shrink-0" />
                  <span>Dr. {d.name}</span>
                  <span className="text-[16px] font-normal text-[#3C5250]">
                    · Live:{" "}
                    <b className="capitalize text-[var(--teal)]">
                      {d.status_state === "in" ? "Doctor In" : d.status_state === "late" ? `Running Late (+${d.late_minutes} min)` : d.status_state === "out" ? "Not In Today" : "Not Set"}
                    </b>
                    · Current Token:{" "}
                    <b className="text-[var(--teal)] font-mono font-bold">#{d.current_token || 0}</b>
                  </span>
                </p>
                <span
                  className={`text-[16px] font-bold px-3 py-1 rounded-full ${
                    isStatusFresh(d.status_at)
                      ? "bg-[#DCFCE7] text-[#14532D]"
                      : "bg-[var(--yellow)] text-[var(--ink)]"
                  }`}
                >
                  {isStatusFresh(d.status_at) ? "Fresh (≤30m)" : "Unconfirmed (>30m)"}
                </span>
              </div>
              <div className="flex gap-2.5 flex-wrap mt-3">
                <button
                  className="btn text-[16px] px-4 flex items-center gap-2 font-bold"
                  onClick={() => nextToken(d.id)}
                >
                  <IconCheckCircle className="w-4 h-4" />
                  Next Token #{(d.current_token || 0) + 1}
                </button>
                <button
                  className="btn text-[16px] px-4 flex items-center gap-2 !bg-[#166534] hover:!bg-[#14532D]"
                  onClick={() => set(d.id, "in")}
                >
                  <IconCheckCircle className="w-4 h-4" />
                  Doctor in
                </button>
                <button
                  className="btn text-[16px] px-4 flex items-center gap-2 !bg-[var(--yellow)] !text-[var(--ink)] hover:brightness-95"
                  onClick={() => set(d.id, "late", 15)}
                >
                  <IconClock className="w-4 h-4 text-[var(--ink)]" />
                  Running late +15 min
                </button>
                <button
                  className="btn text-[16px] px-4 flex items-center gap-2 !bg-[var(--yellow)] !text-[var(--ink)] hover:brightness-95"
                  onClick={() => set(d.id, "late", 30)}
                >
                  <IconClock className="w-4 h-4 text-[var(--ink)]" />
                  Late 30 min
                </button>
                <button
                  className="btn text-[16px] px-4 flex items-center gap-2 !bg-[var(--red)] hover:!bg-[#9E2E24]"
                  onClick={() => set(d.id, "out")}
                >
                  <IconAlertTriangle className="w-4 h-4 text-white" />
                  Not in today
                </button>
              </div>
            </div>
          ))}
        <Feedback msg={msg} />
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <IconAlertTriangle className="w-5 h-5 text-[var(--red)]" />
          <h2 className="font-bold text-[var(--ink)] text-xl font-heading">Needs attention & Staff Handoffs</h2>
        </div>
        <State loading={att.loading} err={att.err} empty={att.data?.length === 0} />
        {att.data?.map((e) => (
          <div
            key={e.id}
            className={`rounded-2xl p-4 mb-3 border-2 ${e.outcome === "urgent"
              ? "bg-[#FDECEA] border-[var(--red)] text-[var(--ink)]"
              : "bg-[#E4EFED]/50 border-[#C8DAD7] text-[var(--ink)]"
              }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-[17px] flex items-center gap-2 flex-wrap">
                {e.outcome === "urgent" ? (
                  <span className="inline-flex items-center gap-1.5 text-[16px] font-bold bg-[var(--red)] text-white px-3 py-1 rounded-full">
                    <IconAlertTriangle className="w-4 h-4 text-white" />
                    URGENT
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[16px] font-bold bg-[#E4EFED] text-[var(--ink)] px-3 py-1 rounded-full">
                    <IconPhone className="w-4 h-4 text-[var(--teal)]" />
                    HANDOFF
                  </span>
                )}
                <span>
                  {e.intent} · via {e.channel}
                </span>
              </p>
            </div>
            <p className="text-[16px] mt-2 text-[#3C5250]">{e.note || "Staff follow-up required"}</p>
            <button
              className="btn2 text-[16px] mt-3 flex items-center gap-2"
              onClick={async () => {
                await api(`/attention/${e.id}/resolve`, { method: "POST" });
                att.reload();
              }}
            >
              <IconCheckCircle className="w-4 h-4 text-[var(--teal)]" />
              Mark as Handled
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Overview() {
  const { data, err, loading } = useLoad<any>("/analytics");
  const safety = useLoad<any[]>("/safety-logs");
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <IconActivity className="w-5 h-5 text-[var(--teal)]" />
          <h2 className="font-bold text-[var(--ink)] text-xl font-heading">Activity (Last 30 days)</h2>
        </div>
        <State loading={loading} err={err} />
        {data && (
          <div className="space-y-4">
            <div className="bg-[#E4EFED]/60 p-4 rounded-2xl border border-[#C8DAD7]">
              <p className="text-3xl font-extrabold text-[var(--ink)] flex items-baseline gap-2 font-heading">
                {data.contacts}
                <span className="text-[16px] font-normal text-[#3C5250] font-sans">patient contacts handled</span>
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-white border border-[#D4E2DF] p-3.5 rounded-xl">
                <span className="text-[16px] font-bold text-[#3C5250] uppercase tracking-wider">Outcomes</span>
                <p className="text-[16px] mt-1 font-medium text-[var(--ink)]">
                  {Object.entries(data.by_outcome)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ") || "No interactions recorded yet"}
                </p>
              </div>
              <div className="bg-white border border-[#D4E2DF] p-3.5 rounded-xl">
                <span className="text-[16px] font-bold text-[#3C5250] uppercase tracking-wider">Channels</span>
                <p className="text-[16px] mt-1 font-medium text-[var(--ink)]">
                  {Object.entries(data.by_channel)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ") || "No interactions recorded yet"}
                </p>
              </div>
            </div>
            <p className="text-[16px] text-[#3C5250]">Source: {data.source}</p>
          </div>
        )}
      </div>

      {/* Pre-Model Safety Trigger Log */}
      <div className="card">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <IconShieldCheck className="w-5 h-5 text-[var(--teal)]" />
            <h2 className="font-bold text-[var(--ink)] text-xl font-heading">Pre-Model Safety Trigger Log</h2>
          </div>
          <span className="text-[16px] font-bold px-3 py-1 rounded-full bg-[#E4EFED] text-[var(--ink)]">
            {safety.data?.length ?? 0} logged
          </span>
        </div>
        <State loading={safety.loading} err={safety.err} empty={safety.data?.length === 0} />
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {safety.data?.slice(0, 15).map((s) => (
            <div
              key={s.id}
              className={`p-3.5 rounded-xl border text-[16px] flex items-start justify-between gap-2 ${
                s.category === "urgent" ? "bg-[#FDECEA] border-[var(--red)]" : "bg-[#FFFBEB] border-[#F4B73F]"
              }`}
            >
              <div className="min-w-0">
                <p className="font-bold text-[var(--ink)]">
                  <span className="uppercase">{s.category}</span> · {s.trigger_rule} · via {s.channel}
                </p>
                <p className="text-[#3C5250] mt-1 break-words">{s.message_excerpt}</p>
              </div>
              <span className="shrink-0 font-mono text-[16px] px-2.5 py-1 rounded bg-white border border-[#C8DAD7] text-[var(--ink)]">
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
    <div className="space-y-4">
      <form onSubmit={add} className="card flex gap-3 flex-wrap items-end">
        <label className="flex-1 text-[16px] font-semibold text-[var(--ink)] min-w-[200px]">
          New Doctor Name
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
          Add Doctor
        </button>
        <div className="w-full">
          <Feedback msg={msg} />
        </div>
      </form>
      <State loading={loading} err={err} empty={data?.length === 0} />
      {data?.map((d) => (
        <div className="card space-y-3" key={d.id}>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#E4EFED] flex items-center justify-center shrink-0">
                <IconStethoscope className="w-5 h-5 text-[var(--teal)]" />
              </div>
              <div>
                <p className="font-bold text-[18px] text-[var(--ink)]">
                  Dr. {d.name} {!d.active && <span className="text-[16px] text-[#3C5250]">(inactive)</span>}
                </p>
                <p className="text-[16px] text-[#3C5250]">
                  {d.speciality} · {d.start_hour}:00–{d.end_hour}:00 · {d.status_note || "No delay reported"}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn2 text-[16px] flex items-center gap-2"
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
              {editingId === d.id ? "Cancel" : "Update Note"}
            </button>
          </div>
          {editingId === d.id && (
            <div className="flex gap-2 flex-wrap pt-2 border-t border-[#D4E2DF]">
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
    <div className="space-y-4">
      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-bold text-[var(--ink)] text-xl font-heading">Book Confirmed Appointment</h2>
          <button
            type="button"
            className="btn2 text-[16px] flex items-center gap-2"
            onClick={() => setShowAddPatient(!showAddPatient)}
          >
            <IconUser className="w-4 h-4" />
            {showAddPatient ? "Close Add Patient" : "+ Quick Add Patient"}
          </button>
        </div>

        {(showAddPatient || p.data?.length === 0) && (
          <form onSubmit={addPatient} className="bg-[#E4EFED]/50 border border-[#C8DAD7] rounded-2xl p-4 grid sm:grid-cols-2 gap-3">
            <p className="sm:col-span-2 text-[16px] font-bold text-[var(--ink)] uppercase tracking-wider">Register Patient</p>
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
              <input type="checkbox" className="w-5 h-5" checked={np.consent} onChange={(e) => setNp({ ...np, consent: e.target.checked })} />
              Consent to updates/reminders
            </label>
            <label className="flex items-center gap-2.5 text-[16px] text-[var(--ink)] min-h-[48px] cursor-pointer">
              <input type="checkbox" className="w-5 h-5" checked={np.no_message} onChange={(e) => setNp({ ...np, no_message: e.target.checked })} />
              Do not message this number
            </label>
            <button className="btn sm:col-span-2">Save Patient</button>
          </form>
        )}
        <Feedback msg={patMsg} />

        <form onSubmit={book} className="grid sm:grid-cols-2 gap-3 pt-1">
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
            Patient has explicitly confirmed this appointment
          </label>
          <button
            className="btn sm:col-span-2 flex items-center justify-center gap-2"
            disabled={!ok}
          >
            <IconCalendar className="w-4 h-4" />
            Book Confirmed Slot
          </button>
          <div className="sm:col-span-2">
            <Feedback msg={msg} />
          </div>
        </form>
      </div>
      <State loading={a.loading} err={a.err} empty={a.data?.length === 0} />
      {a.data?.map((x) => (
        <div className="card flex justify-between items-center gap-3 flex-wrap" key={x.id}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#E4EFED] flex items-center justify-center shrink-0">
              <IconCalendar className="w-5 h-5 text-[var(--teal)]" />
            </div>
            <div>
              <p className="font-bold text-[17px] text-[var(--ink)]">
                #{x.id} · {new Date(x.start).toLocaleString()} ·{" "}
                <span className="capitalize text-[var(--teal)] font-bold">{x.status}</span>
              </p>
              <p className="text-[16px] text-[#3C5250]">Booked via: {x.channel}</p>
            </div>
          </div>
          {x.status === "booked" && (
            <button
              className="btn2 text-[16px] flex items-center gap-2 !text-[var(--red)] !border-[var(--red)] hover:!bg-[#FDECEA]"
              onClick={async () => {
                await api(`/appointments/${x.id}/cancel`, { method: "POST" });
                a.reload();
              }}
            >
              <IconAlertTriangle className="w-4 h-4" />
              Cancel Slot
            </button>
          )}
        </div>
      ))}
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
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-[#D4E2DF] pb-3 mb-1 flex-wrap">
        <div className="flex items-center gap-2">
          <IconMessageSquare className="w-5 h-5 text-[var(--teal)]" />
          <h2 className="font-bold text-[var(--ink)] text-xl font-heading">AI Receptionist Live Testing Console</h2>
        </div>
        <button
          type="button"
          onClick={resetChat}
          disabled={busy}
          className="btn2 text-[16px] px-4"
        >
          New Chat
        </button>
      </div>
      <p className="text-[16px] text-[#3C5250]">
        Test natural replies in Hindi, Hinglish, Marathi, or English. Edit caller name/phone or tap any prompt below to send.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
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
      <div className="flex gap-2 flex-wrap pt-1">
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

      <div ref={logRef} className="space-y-3 max-h-96 overflow-auto p-3 bg-[var(--paper)] rounded-2xl border border-[#D4E2DF]" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.who === "me" ? "justify-end" : "justify-start"}`}>
            {m.who === "ai" && (
              <span className="w-8 h-8 rounded-lg bg-[var(--teal)] text-white flex items-center justify-center shrink-0 mt-1">
                <IconCross className="w-4 h-4 text-white" />
              </span>
            )}
            <p
              className={`rounded-2xl p-3.5 max-w-[85%] whitespace-pre-line text-[16px] ${m.who === "me" ? "bg-[var(--teal)] text-white" : "bg-white border border-[#D4E2DF] text-[var(--ink)] shadow-xs"
                }`}
            >
              {m.t}
            </p>
          </div>
        ))}
        {busy && (
          <div className="flex gap-2 justify-start">
            <span className="w-8 h-8 rounded-lg bg-[var(--teal)] text-white flex items-center justify-center shrink-0 mt-1">
              <IconCross className="w-4 h-4 text-white" />
            </span>
            <p className="rounded-2xl p-3.5 bg-white border border-[#D4E2DF] text-[#3C5250] text-[16px]">
              Parchi is replying…
            </p>
          </div>
        )}
      </div>
      <form onSubmit={send} className="flex flex-col sm:flex-row gap-2">
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
          Send
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
  const [sid] = useState(() => "sim" + Math.random().toString(36).slice(2, 8));
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
      const r = await api("/chat", { method: "POST", body: JSON.stringify({ session_id: sid, message: text, channel: "voice" }) });
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
    const r = await api("/chat/unclear", { method: "POST", body: JSON.stringify({ session_id: sid, message: "?" }) });
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
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#D4E2DF] pb-3 mb-1">
        <div className="flex items-center gap-2">
          <IconMic className="w-5 h-5 text-[var(--teal)]" />
          <h2 className="font-bold text-[var(--ink)] text-xl font-heading">Inbound Call Speech Simulator</h2>
        </div>
        <span className="text-[16px] font-bold bg-[#E4EFED] text-[var(--ink)] px-3 py-1 rounded-full">
          Voice Rule: &lt;2 sentences · no button prompts
        </span>
      </div>
      <p className="text-[16px] text-[#3C5250]">
        Simulates an incoming telephone call directly in your browser. Latency is measured from speech input to audio reply.
      </p>
      <div className="flex gap-2.5 flex-wrap items-center">
        <label className="text-[16px] font-semibold text-[var(--ink)] flex items-center gap-2">
          Language
          <select className="inp w-auto" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="hi-IN">Hindi/Hinglish</option>
            <option value="en-IN">English</option>
            <option value="mr-IN">Marathi</option>
          </select>
        </label>
        <button className="btn text-[16px] flex items-center gap-2" onClick={listen}>
          <IconMic className="w-4 h-4" />
          {listening ? "Listening…" : "Speak"}
        </button>
        <button className="btn2 text-[16px] flex items-center gap-2" onClick={unclear}>
          <IconAlertTriangle className="w-4 h-4 text-[var(--red)]" />
          Simulate Noise
        </button>
        <button
          className="btn2 text-[16px]"
          onClick={() => window.speechSynthesis?.cancel()}
        >
          Stop Audio
        </button>
      </div>
      <div className="flex gap-2 flex-wrap pt-1">
        {PRESETS.map(([n, t]) => (
          <button key={n} className="btn2 text-[16px] px-4" onClick={() => turn(t)}>
            {n}
          </button>
        ))}
      </div>
      {note && <p role="status" className="text-[16px] text-[var(--teal)] font-semibold">{note}</p>}
      <div className="space-y-2.5 max-h-80 overflow-auto pt-2" aria-live="polite">
        {log.length === 0 && (
          <p className="text-[#3C5250] text-[16px]">Start a call simulation: click Speak or any preset scenario above.</p>
        )}
        {log.map((m, i) => (
          <p
            key={i}
            className={`rounded-2xl p-3.5 w-fit max-w-[90%] whitespace-pre-line text-[16px] ${m.who === "caller" ? "bg-[var(--teal)] text-white ml-auto" : "bg-[#E4EFED] text-[var(--ink)]"
              }`}
          >
            {m.t}
            {m.ms !== undefined && <span className="block text-[16px] opacity-90 mt-1">reply in {m.ms} ms</span>}
          </p>
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

  // Owner-only rules state
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
      setPurgeMsg({ text: `Purged ${r.events_deleted} old event(s) older than ${r.retention_days ?? (f?.retention_days || 90)} days.` });
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
      <form onSubmit={save} className="card space-y-4">
        <div className="flex items-center gap-2 border-b border-[#D4E2DF] pb-3 mb-1">
          <IconSettings className="w-5 h-5 text-[var(--teal)]" />
          <h2 className="font-bold text-[var(--ink)] text-xl font-heading">Clinic Information, Consent & Data Retention</h2>
        </div>
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

        <div className="grid sm:grid-cols-2 gap-3 items-end">
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
            <button
              type="button"
              onClick={runPurge}
              className="btn2 text-[16px] flex items-center justify-center gap-2"
            >
              <IconClock className="w-4 h-4 text-[var(--teal)]" />
              Purge Events Older Than {f.retention_days ?? 90} Days
            </button>
          )}
        </div>
        <Feedback msg={purgeMsg} />

        <button className="btn flex items-center gap-2">
          <IconCheckCircle className="w-4 h-4" />
          Save Information
        </button>
        <Feedback msg={msg} />
      </form>

      {/* Per-Patient "Do not message this number" Flag */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between border-b border-[#D4E2DF] pb-3">
          <div className="flex items-center gap-2">
            <IconShieldCheck className="w-5 h-5 text-[var(--teal)]" />
            <div>
              <h2 className="font-bold text-[var(--ink)] text-xl font-heading">Patient Messaging Consent (&ldquo;Do not message this number&rdquo;)</h2>
              <p className="text-[16px] text-[#3C5250]">Checked automatically before any WhatsApp reminder is sent</p>
            </div>
          </div>
        </div>
        <State loading={patients.loading} err={patients.err} empty={patients.data?.length === 0} />
        <Feedback msg={patMsg} />
        <div className="space-y-2.5 max-h-72 overflow-y-auto">
          {patients.data?.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#E4EFED]/40 border border-[#C8DAD7] flex-wrap">
              <div className="min-w-0">
                <p className="text-[17px] font-bold text-[var(--ink)] truncate">
                  {p.name} <span className="font-mono text-[16px] text-[#3C5250]">({p.phone})</span>
                </p>
                <p className="text-[16px] text-[#3C5250]">
                  Consent: <b>{p.consent ? "Yes" : "No"}</b> · Opted out: <b>{p.opted_out ? "Yes" : "No"}</b> ·{" "}
                  Do not message: <b className={p.no_message ? "text-[var(--red)]" : "text-[#14532D]"}>{p.no_message ? "BLOCKED" : "Allowed"}</b>
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleNoMessage(p)}
                className={`min-h-[48px] text-[16px] px-4 py-2 rounded-xl font-bold border-2 shrink-0 transition-colors ${p.no_message
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

      {/* Owner-Only Clinic Rules (Tension 8) */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b border-[#D4E2DF] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <IconShieldCheck className="w-5 h-5 text-[var(--teal)]" />
            <div>
              <h2 className="font-bold text-[var(--ink)] text-xl font-heading">Local Clinic Rules (Owner Only)</h2>
              <p className="text-[16px] text-[#3C5250]">Versioned, audited policies customized for this clinic</p>
            </div>
          </div>
          <span className="text-[16px] font-bold px-3 py-1 rounded-full bg-[#E4EFED] text-[var(--ink)]">
            {isOwner ? "Owner Access" : "Read-Only"}
          </span>
        </div>

        {/* Safety Boundary Notice */}
        <div className="bg-[#FFFBEB] border-2 border-[#F4B73F] rounded-xl p-4 text-[16px] text-[var(--ink)] flex items-start gap-2.5">
          <IconAlertTriangle className="w-5 h-5 text-[var(--red)] shrink-0 mt-0.5" />
          <div>
            <b>Hard Safety Boundary:</b> Local clinic rules can <i>never</i> override 112 emergency escalation, medical advice refusal, report identity disclosure checks, or safe-contact / opt-out preferences. Safety checks are server-enforced prior to all local rules.
          </div>
        </div>

        {isOwner ? (
          <>
            <form onSubmit={saveRule} className="bg-[#E4EFED]/40 p-4 rounded-2xl border border-[#C8DAD7] space-y-3">
              <h3 className="text-[18px] font-bold text-[var(--ink)] font-heading">Add or Update Clinic Rule</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-[16px] font-semibold text-[var(--ink)]">
                  Rule Type
                  <select
                    className="inp mt-1.5"
                    value={ruleKey}
                    onChange={(e) => setRuleKey(e.target.value)}
                  >
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
                Save Versioned Rule
              </button>
              <Feedback msg={ruleMsg} />
            </form>

            {/* Active Rules List */}
            <div className="space-y-2">
              <h3 className="text-[18px] font-bold text-[var(--ink)] font-heading">Active Rules</h3>
              {rulesData.data?.rules?.filter((r: any) => r.active).length === 0 ? (
                <p className="text-[16px] text-[#3C5250] italic">No custom rules active. Default clinic facts apply.</p>
              ) : (
                <div className="space-y-2">
                  {rulesData.data?.rules
                    ?.filter((r: any) => r.active)
                    .map((r: any) => (
                      <div key={r.id} className="p-3.5 bg-white border border-[#D4E2DF] rounded-xl flex items-center justify-between gap-2 flex-wrap">
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

            {/* Audit Trail */}
            {rulesData.data?.audits?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#D4E2DF]">
                <h3 className="text-[16px] font-bold text-[#3C5250] uppercase tracking-wider">Audit Log & Version History</h3>
                <div className="max-h-40 overflow-y-auto space-y-1.5 text-[16px] text-[var(--ink)] font-mono">
                  {rulesData.data.audits.map((a: any) => (
                    <div key={a.id} className="p-2 bg-[#E4EFED]/50 rounded flex justify-between gap-2 flex-wrap">
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
      setUserRole(sessionStorage.getItem("role") || "staff");
      api("/clinic")
        .then((c) => {
          if (c && c.name) {
            setClinicName(c.name);
            sessionStorage.setItem("clinic_name", c.name);
          }
        })
        .catch(() => { });
    }
  }, []);

  if (!ready) return null;

  return (
    <div className="w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-4 overflow-x-hidden min-w-0">
      {/* Header */}
      <header className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white border border-[#D4E2DF] rounded-3xl p-4 sm:p-5 shadow-sm min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-11 h-11 rounded-2xl bg-[var(--teal)] text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
            <IconCross className="w-6 h-6 text-white" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--ink)] leading-tight break-words font-heading">
                {clinicName || "Parchi AI Clinic"}
              </h1>
              {userRole && (
                <span className="text-[16px] font-bold uppercase tracking-wider bg-[#E4EFED] text-[var(--ink)] px-3 py-0.5 rounded-full shrink-0">
                  {userRole}
                </span>
              )}
            </div>
            {userEmail && <p className="text-[16px] text-[#3C5250] font-mono mt-0.5 break-all">{userEmail}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
          <Link
            href="/receptionist"
            className="btn2 text-[16px] px-4 inline-flex items-center gap-2"
          >
            <IconSmartphone className="w-4 h-4 shrink-0" />
            <span>Mobile Desk</span>
          </Link>
          <a
            href="/"
            className="min-h-[48px] text-[16px] text-[#3C5250] hover:text-[var(--teal)] font-semibold px-3 inline-flex items-center transition-colors"
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
      </header>

      {/* Tabs Navigation with SVG Icons */}
      <nav
        className="w-full max-w-full flex flex-wrap sm:flex-nowrap gap-2 sm:overflow-x-auto p-2 bg-white border border-[#D4E2DF] rounded-2xl shadow-xs min-w-0"
        aria-label="Dashboard"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              aria-current={isActive}
              onClick={() => setTab(t.id)}
              className={`min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-[16px] font-bold transition-all flex items-center gap-2 shrink-0 ${isActive
                ? "bg-[var(--teal)] text-white shadow-sm"
                : "text-[#3C5250] hover:bg-[#E4EFED] hover:text-[var(--ink)]"
                }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-[#3C5250]"}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Tab Content */}
      <main className="w-full min-w-0">
        {tab === "Now" && <Now />}
        {tab === "Overview" && <Overview />}
        {tab === "Doctors" && <Doctors />}
        {tab === "Appointments" && <Appointments />}
        {tab === "AI Receptionist" && <Chat />}
        {tab === "Call Simulator" && <Sim />}
        {tab === "Settings" && <Settings userRole={userRole} />}
      </main>
    </div>
  );
}
