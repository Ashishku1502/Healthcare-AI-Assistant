"use client";

import { useState, useEffect } from "react";
import { api, pollBackendHealth, type BackendHealthStatus } from "@/lib/api";
import {
  IconCross,
  IconPhone,
  IconLock,
  IconClock,
  IconAlertTriangle,
  IconShieldCheck,
  IconCheckCircle,
  IconEye,
  IconEyeOff,
  IconBuilding,
  IconStethoscope,
  IconZap,
  IconMail,
  IconCalendar,
  IconSparkles,
} from "@/components/icons";

export default function AuthForm({
  initialMode = "login",
}: {
  initialMode?: "login" | "signup";
}) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup form state
  const [clinicName, setClinicName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [speciality, setSpeciality] = useState("General Physician");
  const [staffPhone, setStaffPhone] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("Mon-Sat 9:00 AM - 7:00 PM");
  const [fees, setFees] = useState("Consultation Rs 300");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [consentAcknowledged, setConsentAcknowledged] = useState(true);
  const [apiStatus, setApiStatus] = useState<BackendHealthStatus>("waking");

  useEffect(() => {
    const controller = new AbortController();
    pollBackendHealth(setApiStatus, controller.signal);
    return () => controller.abort();
  }, []);

  function switchMode(nextMode: "login" | "signup") {
    setMode(nextMode);
    setErr("");
    setSuccessMsg("");
    if (typeof window !== "undefined") {
      const targetPath = nextMode === "signup" ? "/signup" : "/login";
      if (window.location.pathname !== targetPath) {
        window.history.replaceState(null, "", targetPath + window.location.search);
      }
    }
  }

  // Check query param (?mode=signup or ?mode=login)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get("mode");
      if (urlMode === "signup" || urlMode === "login") {
        setMode(urlMode);
      }
    }
  }, []);

  async function performLogin(loginEmail: string, loginPassword: string) {
    setBusy(true);
    setErr("");
    setSuccessMsg("");
    try {
      const res = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      sessionStorage.setItem("token", res.token);
      sessionStorage.setItem("role", res.role);
      sessionStorage.setItem("clinic_id", String(res.clinic_id));
      if (res.clinic_name) sessionStorage.setItem("clinic_name", res.clinic_name);
      if (res.email) sessionStorage.setItem("email", res.email);
      setSuccessMsg("Signed in successfully! Loading dashboard…");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 350);
    } catch (x: any) {
      setErr(x.message || "Invalid email or password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function fillDemo(type: "owner" | "receptionist") {
    switchMode("login");
    const demoEmail = type === "owner" ? "owner@clinic.com" : "desk@clinic.com";
    const demoPass = "clinic1234";
    setEmail(demoEmail);
    setPassword(demoPass);
    await performLogin(demoEmail, demoPass);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErr("Please enter both email address and password.");
      return;
    }
    await performLogin(email, password);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (clinicName.trim().length < 2) {
      setErr("Clinic name must be at least 2 characters.");
      return;
    }
    if (doctorName.trim().length < 2) {
      setErr("Primary doctor name must be at least 2 characters.");
      return;
    }
    if (!/^\d{10,13}$/.test(staffPhone.trim())) {
      setErr("Staff / WhatsApp phone must be 10 to 13 digits.");
      return;
    }
    if (signupPassword.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (!consentAcknowledged) {
      setErr("Please acknowledge the administrative scope confirmation below.");
      return;
    }
    setBusy(true);
    setErr("");
    setSuccessMsg("");
    try {
      const res = await api("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          clinic_name: clinicName.trim(),
          doctor_name: doctorName.trim() || "Dr. Staff",
          speciality: speciality.trim(),
          email: signupEmail.trim(),
          password: signupPassword,
          staff_phone: staffPhone.trim(),
          address: address.trim(),
          hours: hours.trim(),
          fees: fees.trim(),
        }),
      });
      sessionStorage.setItem("token", res.token);
      sessionStorage.setItem("role", res.role);
      sessionStorage.setItem("clinic_id", String(res.clinic_id));
      if (res.clinic_name) sessionStorage.setItem("clinic_name", res.clinic_name);
      if (res.email) sessionStorage.setItem("email", res.email);
      setSuccessMsg("Clinic registered successfully! Welcome to Parchi. Redirecting…");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 400);
    } catch (x: any) {
      setErr(x.message || "Failed to register clinic. Please check all fields.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between">
      {/* Top Bar Navigation */}
      <header className="w-full border-b border-lav bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center font-black shadow-sm group-hover:scale-105 transition-transform">
              <IconCross className="w-5 h-5 text-white" />
            </span>
            <div>
              <span className="text-xl font-bold text-deep tracking-tight">Parchi AI</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold uppercase tracking-wider bg-lav text-brand px-2 py-0.5 rounded-full">
                Front Desk
              </span>
            </div>
          </a>
          <nav className="flex items-center gap-3 text-sm">
            <a href="/" className="text-gray-600 hover:text-brand transition-colors">
              Home
            </a>
            <span className="text-gray-300">|</span>
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="text-brand font-semibold hover:underline flex items-center gap-1.5"
              >
                <IconBuilding className="w-4 h-4" />
                Register Clinic
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-brand font-semibold hover:underline flex items-center gap-1.5"
              >
                <IconLock className="w-4 h-4" />
                Sign In
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 lg:py-12 grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Full Product Information, Trust & Benefits */}
        <section className="lg:col-span-6 space-y-6 min-w-0 w-full">
          <div>
            <span className="inline-flex items-center gap-1.5 bg-lav text-brand px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <IconSparkles className="w-3.5 h-3.5 text-brand shrink-0" />
              Healthcare AI Assistant
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-deep mt-3 leading-tight sm:leading-snug break-words">
              Your clinic&apos;s 24/7 AI Receptionist.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-gray-700 leading-relaxed break-words">
              Parchi handles routine patient phone calls, WhatsApp inquiries, appointment bookings, and doctor wait-time updates in Hindi, Hinglish, Marathi, and English—freeing your staff to focus on in-clinic care.
            </p>
          </div>

          {/* Key Pillars & Capabilities */}
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-white border border-lav rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-brand flex items-center justify-center mb-2.5 shrink-0">
                <IconPhone className="w-5 h-5 text-brand" />
              </div>
              <h3 className="font-bold text-deep text-sm break-words">Calls & WhatsApp</h3>
              <p className="text-xs text-gray-600 mt-1 leading-normal break-words">
                Answers clinic hours, address, fee structure, and doctor availability in the language patients speak.
              </p>
            </div>

            <div className="bg-white border border-lav rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-green-100 text-ok flex items-center justify-center mb-2.5 shrink-0">
                <IconLock className="w-5 h-5 text-ok" />
              </div>
              <h3 className="font-bold text-deep text-sm break-words">Zero Double-Booking</h3>
              <p className="text-xs text-gray-600 mt-1 leading-normal break-words">
                Strict database unique-slot verification. Appointments book only after explicit patient confirmation.
              </p>
            </div>

            <div className="bg-white border border-lav rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2.5 shrink-0">
                <IconClock className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="font-bold text-deep text-sm break-words">1-Tap Doctor Status</h3>
              <p className="text-xs text-gray-600 mt-1 leading-normal break-words">
                Front desk marks doctor delays in 5 seconds. Patients asking &quot;doctor aaye kya?&quot; get accurate live updates.
              </p>
            </div>

            <div className="bg-white border border-lav rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-2.5 shrink-0">
                <IconAlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-deep text-sm break-words">Safety & Triage Escalation</h3>
              <p className="text-xs text-gray-600 mt-1 leading-normal break-words">
                Immediate 112 emergency routing for chest pain or trauma. Medical questions escalate safely to clinic staff.
              </p>
            </div>
          </div>

          {/* Quick Demo Credentials Card */}
          <div className="bg-gradient-to-br from-lav to-purple-50 border-2 border-brand/20 rounded-3xl p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-brand flex items-center gap-1.5 shrink-0">
                <IconZap className="w-4 h-4 text-brand shrink-0" />
                Pre-configured Demo Sandbox
              </span>
              <span className="text-xs text-gray-500 font-medium">Click to test instant login</span>
            </div>
            <p className="text-sm font-semibold text-deep mt-2 break-words">
              Want to test the full system right now without registering?
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <button
                type="button"
                onClick={() => fillDemo("owner")}
                className="text-left bg-white hover:border-brand border border-lav p-3 rounded-xl transition-all shadow-sm hover:scale-[1.02] group"
              >
                <div className="flex justify-between items-center gap-1">
                  <span className="font-bold text-xs text-deep flex items-center gap-1.5 shrink-0">
                    <IconStethoscope className="w-3.5 h-3.5 text-brand shrink-0" />
                    Clinic Owner
                  </span>
                  <span className="text-[10px] bg-purple-100 text-brand px-1.5 py-0.5 rounded font-mono group-hover:bg-brand group-hover:text-white transition-colors shrink-0 whitespace-nowrap">
                    Fill & Login
                  </span>
                </div>
                <p className="text-xs font-mono text-gray-700 mt-1 break-all">owner@clinic.com</p>
                <p className="text-[11px] text-gray-500 break-words">Full dashboard & settings access</p>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("receptionist")}
                className="text-left bg-white hover:border-brand border border-lav p-3 rounded-xl transition-all shadow-sm hover:scale-[1.02] group"
              >
                <div className="flex justify-between items-center gap-1">
                  <span className="font-bold text-xs text-deep flex items-center gap-1.5 shrink-0">
                    <IconPhone className="w-3.5 h-3.5 text-brand shrink-0" />
                    Reception Desk
                  </span>
                  <span className="text-[10px] bg-purple-100 text-brand px-1.5 py-0.5 rounded font-mono group-hover:bg-brand group-hover:text-white transition-colors shrink-0 whitespace-nowrap">
                    Fill & Login
                  </span>
                </div>
                <p className="text-xs font-mono text-gray-700 mt-1 break-all">desk@clinic.com</p>
                <p className="text-[11px] text-gray-500 break-words">Live doctor status & appointments</p>
              </button>
            </div>
          </div>

          {/* Small Backend Status Badge */}
          <div className="inline-flex items-center gap-2 bg-white/90 border border-lav rounded-full px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs w-fit">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${apiStatus === "ready"
                  ? "bg-emerald-500"
                  : apiStatus === "waking"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-red-500"
                }`}
            ></span>
            <span>
              {apiStatus === "ready"
                ? "Server online"
                : apiStatus === "waking"
                  ? "Server is waking up…"
                  : "Server unavailable"}
            </span>
          </div>

          {/* Safety & Compliance Badge */}
          <div className="flex items-center gap-3 text-xs text-gray-600 bg-white/70 border border-lav rounded-2xl p-3">
            <div className="w-8 h-8 rounded-lg bg-lav flex items-center justify-center shrink-0">
              <IconShieldCheck className="w-5 h-5 text-brand" />
            </div>
            <span className="break-words">
              <strong>HIPAA & Indian Digital Health Guidelines:</strong> Patient telephone numbers and records are tenant-isolated. Strict opt-out compliance enforced.
            </span>
          </div>
        </section>

        {/* Right Column: Interactive Login & Signup Form */}
        <section className="lg:col-span-6 w-full max-w-xl mx-auto min-w-0">
          <div className="card shadow-lg border border-lav p-5 sm:p-8">
            {/* Mode Selector Tabs */}
            <div className="flex rounded-2xl bg-lav/60 p-1 mb-6 border border-lav" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                onClick={() => switchMode("login")}
                className={`flex-1 py-2.5 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${mode === "login"
                    ? "bg-white text-brand shadow-sm"
                    : "text-gray-600 hover:text-deep"
                  }`}
              >
                <IconLock className="w-4 h-4 shrink-0" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                onClick={() => switchMode("signup")}
                className={`flex-1 py-2.5 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${mode === "signup"
                    ? "bg-white text-brand shadow-sm"
                    : "text-gray-600 hover:text-deep"
                  }`}
              >
                <IconBuilding className="w-4 h-4 shrink-0" />
                <span>Register Clinic</span>
              </button>
            </div>

            {/* Status & Error Alerts */}
            {err && (
              <div
                role="alert"
                className="mb-5 bg-red-50 border border-red-200 text-red-800 rounded-2xl p-3.5 text-sm flex items-start gap-2.5 animate-fadeIn"
              >
                <IconAlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{err}</div>
              </div>
            )}

            {successMsg && (
              <div
                role="status"
                className="mb-5 bg-green-50 border border-green-200 text-green-800 rounded-2xl p-3.5 text-sm flex items-start gap-2.5 animate-fadeIn"
              >
                <IconCheckCircle className="w-5 h-5 text-ok shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{successMsg}</div>
              </div>
            )}

            {/* TAB 1: LOGIN FORM */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-deep">Welcome Back</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Sign in to manage appointments, doctor status, and AI triage.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <IconMail className="w-4 h-4" />
                    </span>
                    <input
                      className="inp pl-9 focus:ring-2 focus:ring-brand focus:border-brand"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="e.g. owner@clinic.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-800">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-brand font-medium hover:underline flex items-center gap-1"
                    >
                      {showPassword ? (
                        <>
                          <IconEyeOff className="w-3.5 h-3.5" /> Hide
                        </>
                      ) : (
                        <>
                          <IconEye className="w-3.5 h-3.5" /> Show
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <IconLock className="w-4 h-4" />
                    </span>
                    <input
                      className="inp pl-9 focus:ring-2 focus:ring-brand focus:border-brand"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="btn w-full text-base py-3 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    disabled={busy}
                  >
                    {busy ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Signing in…
                      </span>
                    ) : (
                      <>
                        <IconLock className="w-4 h-4" />
                        Sign In to Clinic Dashboard
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-4 border-t border-lav text-center">
                  <p className="text-sm text-gray-600">
                    Need a new clinic setup?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="text-brand font-bold hover:underline"
                    >
                      Start 14-day pilot
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* TAB 2: SIGN UP / REGISTRATION FORM */}
            {mode === "signup" && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-deep">Register Your Clinic</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Set up your AI front desk in minutes. No credit card required.
                  </p>
                </div>

                {/* Clinic & Doctor Details */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Clinic / Hospital Name *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <IconBuilding className="w-4 h-4" />
                      </span>
                      <input
                        className="inp pl-9 text-sm"
                        required
                        minLength={2}
                        placeholder="e.g. Apollo Care Clinic"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Primary Doctor Name *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <IconStethoscope className="w-4 h-4" />
                      </span>
                      <input
                        className="inp pl-9 text-sm"
                        required
                        minLength={2}
                        placeholder="e.g. Dr. Rajesh Sharma"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Medical Speciality
                    </label>
                    <select
                      className="inp text-sm"
                      value={speciality}
                      onChange={(e) => setSpeciality(e.target.value)}
                    >
                      <option value="General Physician">General Physician / MBBS</option>
                      <option value="Pediatrician">Pediatrician (Child Specialist)</option>
                      <option value="Cardiologist">Cardiologist (Heart Specialist)</option>
                      <option value="Orthopedic">Orthopedic Surgeon</option>
                      <option value="Dentist">Dentist / Dental Surgeon</option>
                      <option value="Gynecologist">Gynecologist & Obstetrics</option>
                      <option value="Dermatologist">Dermatologist (Skin Specialist)</option>
                      <option value="ENT Specialist">ENT Specialist</option>
                      <option value="Ophthalmologist">Ophthalmologist (Eye Care)</option>
                      <option value="Homeopathy / Ayurveda">Homeopathy / Ayurveda</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Staff / WhatsApp Phone *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <IconPhone className="w-4 h-4" />
                      </span>
                      <input
                        className="inp pl-9 text-sm"
                        required
                        type="tel"
                        pattern="[0-9]{10,13}"
                        placeholder="e.g. 9876543210"
                        value={staffPhone}
                        onChange={(e) => setStaffPhone(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                  </div>
                </div>

                {/* Account Credentials */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Owner Email *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <IconMail className="w-4 h-4" />
                      </span>
                      <input
                        className="inp pl-9 text-sm"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="e.g. doctor@clinic.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-brand hover:underline flex items-center gap-1"
                      >
                        {showPassword ? (
                          <>
                            <IconEyeOff className="w-3 h-3" /> Hide
                          </>
                        ) : (
                          <>
                            <IconEye className="w-3 h-3" /> Show
                          </>
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <IconLock className="w-4 h-4" />
                      </span>
                      <input
                        className="inp pl-9 text-sm"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        placeholder="Min. 6 characters"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Practice Information */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Clinic Address & City
                    </label>
                    <input
                      className="inp text-sm"
                      placeholder="e.g. MG Road, Nagpur"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Consultation Fees
                    </label>
                    <input
                      className="inp text-sm"
                      placeholder="e.g. Rs 300 (Followup Rs 200)"
                      value={fees}
                      onChange={(e) => setFees(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Operating Hours
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <IconCalendar className="w-4 h-4" />
                    </span>
                    <input
                      className="inp pl-9 text-sm"
                      placeholder="e.g. Mon-Sat 9:00 AM - 7:00 PM"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                    />
                  </div>
                </div>

                {/* Non-medical advice & terms acknowledgement */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded text-brand focus:ring-brand"
                      checked={consentAcknowledged}
                      onChange={(e) => setConsentAcknowledged(e.target.checked)}
                    />
                    <span>
                      I understand that Parchi AI operates solely as an administrative front-desk assistant and does not provide medical diagnoses or clinical prescriptions.
                    </span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="btn w-full text-base py-3 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    disabled={busy || !consentAcknowledged}
                  >
                    {busy ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Registering Clinic…
                      </span>
                    ) : (
                      <>
                        <IconSparkles className="w-4 h-4" />
                        Complete Clinic Registration
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-4 border-t border-lav text-center">
                  <p className="text-sm text-gray-600">
                    Already have a clinic account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="text-brand font-bold hover:underline"
                    >
                      Sign in here
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-deep text-white text-xs py-5 px-4 text-center sm:text-left border-t border-white/10 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="flex items-center gap-2 justify-center sm:justify-start break-words">
            <span className="w-5 h-5 rounded-md bg-brand text-white flex items-center justify-center shrink-0">
              <IconCross className="w-3.5 h-3.5 text-white" />
            </span>
            <span>© {new Date().getFullYear()} Parchi AI · Automated Front Desk for Medical Practices</span>
          </span>
          <span className="text-purple-200/80 break-words text-center sm:text-right">
            For clinic administration & scheduling only · Compliant with telemedicine guidelines
          </span>
        </div>
      </footer>
    </div>
  );
}
