"use client";

import { useEffect, useState, useCallback } from "react";
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
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
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
      <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
        <span className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin"></span>
        Loading…
      </div>
    );
  if (err)
    return (
      <div role="alert" className="flex items-center gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-xl">
        <IconAlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
        <span>{err}</span>
      </div>
    );
  return empty ? <p className="text-gray-500 text-sm py-2">Nothing here yet.</p> : null;
}

function Now() {
  const doc = useLoad<any[]>("/doctors");
  const att = useLoad<any[]>("/attention");
  const [msg, setMsg] = useState("");

  async function set(id: number, state: string, late = 0) {
    try {
      await api(`/doctors/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ state, late_minutes: late }),
      });
      setMsg("Status updated. Parchi will now answer patients with this.");
      doc.reload();
    } catch (x: any) {
      setMsg(x.message);
    }
  }

  async function nextToken(id: number) {
    try {
      const res = await api(`/doctors/${id}/next-token`, { method: "POST" });
      setMsg(`Token advanced to #${res.current_token || 1}. Patients will be told this.`);
      doc.reload();
    } catch (x: any) {
      setMsg(x.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <IconClock className="w-5 h-5 text-brand" />
            <h2 className="font-bold text-deep text-lg">Doctor status (tap once, ~5 seconds)</h2>
          </div>
          <Link
            href="/receptionist"
            className="text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span>📱 Mobile Receptionist View (1 Phone)</span>
            <span>→</span>
          </Link>
        </div>
        <State loading={doc.loading} err={doc.err} empty={doc.data?.length === 0} />
        {doc.data
          ?.filter((d) => d.active)
          .map((d) => (
            <div key={d.id} className="mb-4 bg-lav/40 p-3.5 rounded-2xl border border-lav">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <p className="font-semibold text-deep flex items-center gap-1.5">
                  <IconStethoscope className="w-4 h-4 text-brand" />
                  Dr. {d.name}
                  <span className="text-sm font-normal text-gray-600">
                    · Live:{" "}
                    <b className="capitalize text-brand">
                      {d.status_state === "in" ? "Doctor In" : d.status_state === "late" ? `Running Late (+${d.late_minutes} min)` : d.status_state === "out" ? "Not In Today" : "Not Set"}
                    </b>
                    · Current Token:{" "}
                    <b className="text-brand font-mono font-bold">#{d.current_token || 0}</b>
                  </span>
                </p>
              </div>
              <div className="flex gap-2 flex-wrap mt-2.5">
                <button
                  className="btn text-xs py-1.5 px-3.5 flex items-center gap-1.5 font-bold !bg-indigo-600 hover:!bg-indigo-700"
                  onClick={() => nextToken(d.id)}
                >
                  <IconCheckCircle className="w-3.5 h-3.5" />
                  Next Token #{(d.current_token || 0) + 1}
                </button>
                <button
                  className="btn text-xs py-1.5 px-3.5 flex items-center gap-1.5 !bg-emerald-600 hover:!bg-emerald-700"
                  onClick={() => set(d.id, "in")}
                >
                  <IconCheckCircle className="w-3.5 h-3.5" />
                  Doctor in
                </button>
                <button
                  className="btn2 text-xs py-1.5 px-3 flex items-center gap-1.5 !text-amber-800 !border-amber-300 hover:!bg-amber-50"
                  onClick={() => set(d.id, "late", 15)}
                >
                  <IconClock className="w-3.5 h-3.5 text-amber-600" />
                  Running late +15 min
                </button>
                <button
                  className="btn2 text-xs py-1.5 px-3 flex items-center gap-1.5 !text-amber-800 !border-amber-300 hover:!bg-amber-50"
                  onClick={() => set(d.id, "late", 30)}
                >
                  <IconClock className="w-3.5 h-3.5 text-amber-600" />
                  Late 30 min
                </button>
                <button
                  className="btn2 text-xs py-1.5 px-3 flex items-center gap-1.5 !text-red-700 !border-red-300 hover:!bg-red-50"
                  onClick={() => set(d.id, "out")}
                >
                  <IconAlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  Not in today
                </button>
              </div>
            </div>
          ))}
        {msg && (
          <div role="status" className="flex items-center gap-2 text-sm text-ok bg-green-50 p-2.5 rounded-xl mt-2">
            <IconCheckCircle className="w-4 h-4 text-ok" />
            <span>{msg}</span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <IconAlertTriangle className="w-5 h-5 text-amber-600" />
          <h2 className="font-bold text-deep text-lg">Needs attention & Staff Handoffs</h2>
        </div>
        <State loading={att.loading} err={att.err} empty={att.data?.length === 0} />
        {att.data?.map((e) => (
          <div
            key={e.id}
            className={`rounded-2xl p-4 mb-2.5 border ${e.outcome === "urgent"
              ? "bg-red-50 border-red-300 text-red-950"
              : "bg-lav border-lav/80"
              }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold flex items-center gap-1.5">
                {e.outcome === "urgent" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-200 text-red-900 px-2 py-0.5 rounded-full">
                    <IconAlertTriangle className="w-3.5 h-3.5 text-red-700" />
                    URGENT
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full">
                    <IconPhone className="w-3 h-3 text-brand" />
                    HANDOFF
                  </span>
                )}
                <span>
                  {e.intent} · via {e.channel}
                </span>
              </p>
            </div>
            <p className="text-sm mt-1.5 text-gray-700">{e.note || "Staff follow-up required"}</p>
            <button
              className="btn2 text-xs py-1 px-3 mt-2.5 flex items-center gap-1.5"
              onClick={async () => {
                await api(`/attention/${e.id}/resolve`, { method: "POST" });
                att.reload();
              }}
            >
              <IconCheckCircle className="w-3.5 h-3.5 text-ok" />
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
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <IconActivity className="w-5 h-5 text-brand" />
        <h2 className="font-bold text-deep text-lg">Activity (Last 30 days)</h2>
      </div>
      <State loading={loading} err={err} />
      {data && (
        <div className="space-y-4">
          <div className="bg-lav/50 p-4 rounded-2xl border border-lav">
            <p className="text-3xl font-extrabold text-deep flex items-baseline gap-2">
              {data.contacts}
              <span className="text-sm font-normal text-gray-600">patient contacts handled</span>
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-white border border-lav p-3 rounded-xl">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Outcomes</span>
              <p className="text-sm mt-1 font-medium">
                {Object.entries(data.by_outcome)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ") || "No interactions recorded yet"}
              </p>
            </div>
            <div className="bg-white border border-lav p-3 rounded-xl">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Channels</span>
              <p className="text-sm mt-1 font-medium">
                {Object.entries(data.by_channel)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ") || "No interactions recorded yet"}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Source: {data.source}</p>
        </div>
      )}
    </div>
  );
}

function Doctors() {
  const { data, err, loading, reload } = useLoad<any[]>("/doctors");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await api("/doctors", { method: "POST", body: JSON.stringify({ name }) });
      setName("");
      reload();
    } catch (x: any) {
      setMsg(x.message);
    }
  }

  async function note(d: any) {
    const s = prompt("Status note (e.g. running 20 min late). Leave empty to clear.", d.status_note);
    if (s === null) return;
    await api(`/doctors/${d.id}`, { method: "PUT", body: JSON.stringify({ ...d, status_note: s }) });
    reload();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card flex gap-2 flex-wrap items-end">
        <label className="flex-1 text-sm font-medium min-w-[200px]">
          New Doctor Name
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <IconStethoscope className="w-4 h-4" />
            </span>
            <input
              className="inp pl-9 text-sm"
              required
              minLength={2}
              placeholder="e.g. Dr. Rajesh Verma"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </label>
        <button className="btn text-sm py-2.5 px-4 flex items-center gap-1.5">
          <IconCross className="w-4 h-4" />
          Add Doctor
        </button>
        {msg && <p role="alert" className="text-red-700 text-sm w-full">{msg}</p>}
      </form>
      <State loading={loading} err={err} empty={data?.length === 0} />
      {data?.map((d) => (
        <div className="card flex justify-between items-center gap-2 flex-wrap" key={d.id}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <IconStethoscope className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="font-semibold text-deep">
                Dr. {d.name} {!d.active && <span className="text-xs text-gray-500">(inactive)</span>}
              </p>
              <p className="text-sm text-gray-600">
                {d.speciality} · {d.start_hour}:00–{d.end_hour}:00 · {d.status_note || "No delay reported"}
              </p>
            </div>
          </div>
          <button className="btn2 text-xs py-1.5 px-3 flex items-center gap-1.5" onClick={() => note(d)}>
            <IconClock className="w-3.5 h-3.5" />
            Update Note
          </button>
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
  const [msg, setMsg] = useState("");

  async function book(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
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
      setMsg("Appointment confirmed and booked.");
    } catch (x: any) {
      setMsg(x.message);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={book} className="card grid sm:grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Doctor
          <select
            className="inp mt-1 text-sm"
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
        <label className="text-sm font-medium">
          Patient
          <select
            className="inp mt-1 text-sm"
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
        <label className="text-sm font-medium">
          Date & Time
          <input
            className="inp mt-1 text-sm"
            type="datetime-local"
            required
            value={f.start}
            onChange={(e) => setF({ ...f, start: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm self-end min-h-[44px]">
          <input
            type="checkbox"
            className="rounded text-brand"
            checked={ok}
            onChange={(e) => setOk(e.target.checked)}
          />
          Patient has explicitly confirmed this appointment
        </label>
        <button
          className="btn sm:col-span-2 text-sm py-2.5 flex items-center justify-center gap-2"
          disabled={!ok}
        >
          <IconCalendar className="w-4 h-4" />
          Book Confirmed Slot
        </button>
        {msg && <p role="status" className="sm:col-span-2 text-sm text-ok">{msg}</p>}
      </form>
      <State loading={a.loading} err={a.err} empty={a.data?.length === 0} />
      {a.data?.map((x) => (
        <div className="card flex justify-between items-center gap-2" key={x.id}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <IconCalendar className="w-4 h-4 text-brand" />
            </div>
            <div>
              <p className="font-semibold text-deep">
                #{x.id} · {new Date(x.start).toLocaleString()} ·{" "}
                <span className="capitalize text-brand font-bold">{x.status}</span>
              </p>
              <p className="text-xs text-gray-500">Booked via: {x.channel}</p>
            </div>
          </div>
          {x.status === "booked" && (
            <button
              className="btn2 text-xs py-1.5 px-3 flex items-center gap-1.5 !text-red-700 !border-red-300 hover:!bg-red-50"
              onClick={async () => {
                await api(`/appointments/${x.id}/cancel`, { method: "POST" });
                a.reload();
              }}
            >
              <IconAlertTriangle className="w-3.5 h-3.5" />
              Cancel Slot
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function Chat() {
  const [msgs, setMsgs] = useState<{ who: string; t: string }[]>([
    {
      who: "ai",
      t: "Hello! I'm Parchi, your clinic's AI receptionist. Ask about clinic timings, fees, doctor availability, or booking a slot.",
    },
  ]);
  const [t, setT] = useState("");
  const [sid] = useState(() => "web" + Math.random().toString(36).slice(2, 8));
  const [busy, setBusy] = useState(false);
  const [pn, setPn] = useState("");
  const [pp, setPp] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const m = t;
    setT("");
    setMsgs((x) => [...x, { who: "me", t: m }]);
    setBusy(true);
    try {
      const r = await api("/chat", {
        method: "POST",
        body: JSON.stringify({
          session_id: sid,
          message: m,
          patient_name: pn || undefined,
          patient_phone: pp || undefined,
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

  function quickTest(msg: string) {
    setT(msg);
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2 border-b border-lav pb-2 mb-1">
        <IconMessageSquare className="w-5 h-5 text-brand" />
        <h2 className="font-bold text-deep text-lg">AI Receptionist Live Testing Console</h2>
      </div>
      <p className="text-xs text-gray-500">
        Test natural replies in Hindi, Hinglish, or English. To test booking, enter patient name and phone.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <IconUser className="w-4 h-4" />
          </span>
          <input
            aria-label="Patient name"
            className="inp pl-9 text-sm"
            placeholder="Patient name (e.g. Rahul Kumar)"
            value={pn}
            onChange={(e) => setPn(e.target.value)}
          />
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <IconPhone className="w-4 h-4" />
          </span>
          <input
            aria-label="Patient phone"
            className="inp pl-9 text-sm"
            placeholder="Phone e.g. 9876543210"
            value={pp}
            onChange={(e) => setPp(e.target.value)}
          />
        </div>
      </div>

      {/* Quick Test Prompt Pills */}
      <div className="flex gap-1.5 flex-wrap pt-1">
        {[
          "Doctor aa gaye kya?",
          "Fees kitni hai?",
          "Clinic address & hours?",
          "Doctor availability?",
          "Bachche ko 102 bukhar hai",
          "Seene mein dard hai",
          "YES",
          "NO"
        ].map((promptText) => (
          <button
            key={promptText}
            type="button"
            className="btn2 text-xs !min-h-[30px] py-1 px-2.5 bg-lav/40 hover:bg-lav transition-colors"
            onClick={() => quickTest(promptText)}
          >
            {promptText}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-96 overflow-auto p-2 bg-gray-50/50 rounded-2xl" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.who === "me" ? "justify-end" : "justify-start"}`}>
            {m.who === "ai" && (
              <span className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center shrink-0 mt-1">
                <IconCross className="w-4 h-4 text-white" />
              </span>
            )}
            <p
              className={`rounded-2xl p-3 max-w-[85%] whitespace-pre-line text-sm ${m.who === "me" ? "bg-brand text-white" : "bg-white border border-lav text-gray-800 shadow-xs"
                }`}
            >
              {m.t}
            </p>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input
          aria-label="Message"
          className="inp text-sm"
          required
          maxLength={500}
          placeholder="Ask a question (e.g. fees kitni hai? doctor kab aayenge?)"
          value={t}
          onChange={(e) => setT(e.target.value)}
        />
        <button className="btn text-sm px-5 flex items-center gap-1.5" disabled={busy}>
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
    <div className="card space-y-3">
      <div className="flex items-center gap-2 border-b border-lav pb-2 mb-1">
        <IconMic className="w-5 h-5 text-brand" />
        <h2 className="font-bold text-deep text-lg">Inbound Call Speech Simulator</h2>
      </div>
      <p className="text-xs text-gray-500">
        Simulates an incoming telephone call directly in your browser. Latency is measured from speech input to audio reply.
      </p>
      <div className="flex gap-2 flex-wrap items-center">
        <label className="text-sm font-medium flex items-center gap-1.5">
          Language
          <select className="inp text-sm py-1.5" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="hi-IN">Hindi/Hinglish</option>
            <option value="en-IN">English</option>
            <option value="mr-IN">Marathi</option>
          </select>
        </label>
        <button className="btn text-sm py-2 px-4 flex items-center gap-1.5" onClick={listen}>
          <IconMic className="w-4 h-4" />
          {listening ? "Listening…" : "Speak"}
        </button>
        <button className="btn2 text-sm py-2 px-3 flex items-center gap-1.5" onClick={unclear}>
          <IconAlertTriangle className="w-4 h-4 text-amber-600" />
          Simulate Noise
        </button>
        <button
          className="btn2 text-sm py-2 px-3"
          onClick={() => window.speechSynthesis?.cancel()}
        >
          Stop Audio
        </button>
      </div>
      <div className="flex gap-2 flex-wrap pt-1">
        {PRESETS.map(([n, t]) => (
          <button key={n} className="btn2 text-xs py-1.5 px-3" onClick={() => turn(t)}>
            {n}
          </button>
        ))}
      </div>
      {note && <p role="status" className="text-xs text-brand font-medium">{note}</p>}
      <div className="space-y-2 max-h-80 overflow-auto pt-2" aria-live="polite">
        {log.length === 0 && (
          <p className="text-gray-400 text-sm">Start a call simulation: click Speak or any preset scenario above.</p>
        )}
        {log.map((m, i) => (
          <p
            key={i}
            className={`rounded-2xl p-3 w-fit max-w-[90%] whitespace-pre-line text-sm ${m.who === "caller" ? "bg-brand text-white ml-auto" : "bg-lav"
              }`}
          >
            {m.t}
            {m.ms !== undefined && <span className="block text-xs opacity-70 mt-1">reply in {m.ms} ms</span>}
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
  const [msg, setMsg] = useState("");
  const [purgeMsg, setPurgeMsg] = useState("");
  const [patMsg, setPatMsg] = useState("");

  // Owner-only rules state
  const isOwner = userRole === "owner";
  const rulesData = useLoad<any>(isOwner ? "/rules/history" : "");
  const [ruleKey, setRuleKey] = useState("queue_priority");
  const [ruleVal, setRuleVal] = useState("elderly first");
  const [ruleMsg, setRuleMsg] = useState("");

  useEffect(() => {
    if (data) setF(data);
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
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
      setMsg("Settings saved successfully.");
      reload();
    } catch (x: any) {
      setMsg(x.message);
    }
  }

  async function runPurge() {
    setPurgeMsg("");
    try {
      const r = await api<any>("/admin/purge", { method: "POST" });
      setPurgeMsg(`Purged ${r.events_deleted} old event(s) older than ${r.retention_days ?? (f?.retention_days || 90)} days.`);
    } catch (x: any) {
      setPurgeMsg(x.message);
    }
  }

  async function toggleNoMessage(p: any) {
    setPatMsg("");
    try {
      const next = !p.no_message;
      await api(`/patients/${p.id}/no-message`, {
        method: "PUT",
        body: JSON.stringify({ no_message: next }),
      });
      setPatMsg(`${p.name}: "Do not message this number" ${next ? "enabled" : "disabled"}.`);
      patients.reload();
    } catch (x: any) {
      setPatMsg(x.message);
    }
  }

  async function saveRule(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/rules", {
        method: "POST",
        body: JSON.stringify({ rule_key: ruleKey, rule_value: ruleVal }),
      });
      setRuleMsg(`Rule '${ruleKey}' saved and audited successfully.`);
      rulesData.reload();
    } catch (x: any) {
      setRuleMsg(x.message);
    }
  }

  if (!f) return <State loading={loading} err={err} />;
  return (
    <div className="space-y-6">
      <form onSubmit={save} className="card space-y-3">
        <div className="flex items-center gap-2 border-b border-lav pb-2 mb-1">
          <IconSettings className="w-5 h-5 text-brand" />
          <h2 className="font-bold text-deep text-lg">Clinic Information, Consent & Data Retention</h2>
        </div>
        {["name", "address", "hours", "fees", "staff_phone"].map((k) => (
          <label key={k} className="block text-sm font-medium capitalize">
            {k.replace("_", " ")}
            <input
              className="inp mt-1 text-sm"
              value={f[k] || ""}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
            />
          </label>
        ))}

        <label className="block text-sm font-medium">
          Patient Consent Line (DPDP & WhatsApp)
          <textarea
            className="inp mt-1 text-sm min-h-[72px]"
            maxLength={500}
            value={f.consent_line ?? ""}
            onChange={(e) => setF({ ...f, consent_line: e.target.value })}
            placeholder="By messaging or sharing your phone number, you consent to clinic updates and reminders (reply STOP to opt out)."
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-3 items-end">
          <label className="block text-sm font-medium">
            Data Retention Period (Days — default 90)
            <input
              type="number"
              min={1}
              max={3650}
              className="inp mt-1 text-sm"
              value={f.retention_days ?? 90}
              onChange={(e) => setF({ ...f, retention_days: Number(e.target.value) })}
            />
          </label>
          {isOwner && (
            <button
              type="button"
              onClick={runPurge}
              className="btn2 text-xs py-2.5 px-4 flex items-center justify-center gap-1.5"
            >
              <IconClock className="w-3.5 h-3.5 text-brand" />
              Purge Events Older Than {f.retention_days ?? 90} Days
            </button>
          )}
        </div>
        {purgeMsg && <p role="status" className="text-xs text-brand font-medium">{purgeMsg}</p>}

        <button className="btn text-sm py-2.5 px-5 flex items-center gap-1.5">
          <IconCheckCircle className="w-4 h-4" />
          Save Information
        </button>
        {msg && <p role="status" className="text-sm text-ok">{msg}</p>}
      </form>

      {/* Per-Patient "Do not message this number" Flag */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between border-b border-lav pb-2">
          <div className="flex items-center gap-2">
            <IconShieldCheck className="w-5 h-5 text-brand" />
            <div>
              <h2 className="font-bold text-deep text-lg">Patient Messaging Consent (&ldquo;Do not message this number&rdquo;)</h2>
              <p className="text-xs text-gray-500">Checked automatically before any WhatsApp reminder is sent</p>
            </div>
          </div>
        </div>
        <State loading={patients.loading} err={patients.err} empty={patients.data?.length === 0} />
        {patMsg && <p role="status" className="text-xs text-ok font-medium">{patMsg}</p>}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {patients.data?.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-lav/30 border border-lav">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-deep truncate">
                  {p.name} <span className="font-mono text-xs text-gray-500">({p.phone})</span>
                </p>
                <p className="text-xs text-gray-600">
                  Consent: <b>{p.consent ? "Yes" : "No"}</b> · Opted out: <b>{p.opted_out ? "Yes" : "No"}</b> ·{" "}
                  Do not message: <b className={p.no_message ? "text-red-700" : "text-emerald-700"}>{p.no_message ? "BLOCKED" : "Allowed"}</b>
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleNoMessage(p)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold border shrink-0 transition-colors ${p.no_message
                    ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
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
        <div className="flex items-center justify-between border-b border-lav pb-2.5">
          <div className="flex items-center gap-2">
            <IconShieldCheck className="w-5 h-5 text-brand" />
            <div>
              <h2 className="font-bold text-deep text-lg">Local Clinic Rules (Owner Only)</h2>
              <p className="text-xs text-gray-500">Versioned, audited policies customized for this clinic</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand/10 text-brand">
            {isOwner ? "Owner Access" : "Read-Only"}
          </span>
        </div>

        {/* Safety Boundary Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
          <IconAlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <b>Hard Safety Boundary:</b> Local clinic rules can <i>never</i> override 112 emergency escalation, medical advice refusal, report identity disclosure checks, or safe-contact / opt-out preferences. Safety checks are server-enforced prior to all local rules.
          </div>
        </div>

        {isOwner ? (
          <>
            <form onSubmit={saveRule} className="bg-lav/30 p-4 rounded-2xl border border-lav space-y-3">
              <h3 className="text-sm font-bold text-deep">Add or Update Clinic Rule</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-gray-700">
                  Rule Type
                  <select
                    className="inp mt-1 text-sm"
                    value={ruleKey}
                    onChange={(e) => setRuleKey(e.target.value)}
                  >
                    <option value="queue_priority">Queue Priority (e.g., elderly first)</option>
                    <option value="hours">Custom Hours (e.g., Mon-Sat 8:00 AM - 8:00 PM)</option>
                    <option value="walkin_policy">Walk-in Policy</option>
                    <option value="custom_policy">Custom Policy</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-gray-700">
                  Rule Policy Text
                  <input
                    className="inp mt-1 text-sm"
                    placeholder="e.g. elderly first"
                    value={ruleVal}
                    onChange={(e) => setRuleVal(e.target.value)}
                    required
                  />
                </label>
              </div>
              <button className="btn text-xs py-2 px-4 flex items-center gap-1.5">
                <IconCheckCircle className="w-3.5 h-3.5" />
                Save Versioned Rule
              </button>
              {ruleMsg && <p className="text-xs text-ok">{ruleMsg}</p>}
            </form>

            {/* Active Rules List */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-deep">Active Rules</h3>
              {rulesData.data?.rules?.filter((r: any) => r.active).length === 0 ? (
                <p className="text-xs text-gray-500 italic">No custom rules active. Default clinic facts apply.</p>
              ) : (
                <div className="space-y-2">
                  {rulesData.data?.rules
                    ?.filter((r: any) => r.active)
                    .map((r: any) => (
                      <div key={r.id} className="p-3 bg-white border border-lav rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold font-mono uppercase bg-gray-100 px-2 py-0.5 rounded text-gray-700 mr-2">
                            {r.rule_key}
                          </span>
                          <span className="text-sm text-deep font-medium">{r.rule_value}</span>
                        </div>
                        <span className="text-xs text-brand font-semibold px-2 py-0.5 rounded bg-brand/10">
                          v{r.version}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Audit Trail */}
            {rulesData.data?.audits?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-lav">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Audit Log & Version History</h3>
                <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-gray-600 font-mono">
                  {rulesData.data.audits.map((a: any) => (
                    <div key={a.id} className="p-1.5 bg-lav/40 rounded flex justify-between">
                      <span>{a.action}</span>
                      <span className="text-gray-400">{a.actor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-600 italic">
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
    <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-4 overflow-x-hidden min-w-0">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white border border-lav rounded-2xl p-4 shadow-sm min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
            <IconCross className="w-6 h-6 text-white" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-deep leading-tight break-words">
                {clinicName || "Parchi AI Clinic"}
              </h1>
              {userRole && (
                <span className="text-[11px] font-bold uppercase tracking-wider bg-lav text-brand px-2 py-0.5 rounded-full shrink-0">
                  {userRole}
                </span>
              )}
            </div>
            {userEmail && <p className="text-xs text-gray-500 font-mono mt-0.5 break-all">{userEmail}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <a
            href="/"
            className="text-xs text-gray-500 hover:text-brand font-medium px-2 py-1 transition-colors"
          >
            Public Site
          </a>
          <button
            className="btn2 text-xs !min-h-[36px] py-1 px-3.5 flex items-center gap-1.5 shrink-0"
            onClick={() => {
              sessionStorage.clear();
              window.location.href = "/login";
            }}
          >
            <IconLogOut className="w-3.5 h-3.5 text-gray-600 shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </header>

      {/* Tabs Navigation with SVG Icons */}
      <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-none" aria-label="Dashboard">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              aria-current={isActive}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 ${isActive
                ? "bg-brand text-white shadow-sm"
                : "bg-white text-gray-700 border border-lav hover:bg-lav"
                }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-gray-500"}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Tab Content */}
      <main>
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
