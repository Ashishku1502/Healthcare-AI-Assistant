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
  IconMail,
  IconCalendar,
  IconSparkles,
} from "@/components/icons";
import { AuthReceptionIllustration } from "@/components/graphics";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <div className="min-h-screen text-[var(--ink)] flex flex-col justify-between">
      {/* Top Bar Navigation */}
      <header className="w-full border-b-2 border-[var(--ink)] bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          <a href="/" className="min-h-[48px] flex items-center gap-2 group shrink-0">
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--teal)] border-2 border-[var(--ink)] text-white flex items-center justify-center font-heading font-extrabold text-[19px] shrink-0">
              P
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[18px] sm:text-xl font-bold text-[var(--ink)] tracking-tight font-heading whitespace-nowrap">Parchi AI</span>
              <span className="hidden sm:inline-block text-[16px] font-bold bg-[var(--yellow)] border-2 border-[var(--ink)] text-[var(--ink)] px-3 py-0.5 rounded-lg whitespace-nowrap">
                Front Desk
              </span>
            </div>
          </a>
          <nav className="flex items-center gap-1 sm:gap-2 text-[16px] shrink-0">
            <ThemeToggle />
            <a href="/" className="min-h-[48px] px-2 sm:px-2.5 inline-flex items-center text-[var(--ink)] font-bold hover:text-[var(--teal)] transition-colors whitespace-nowrap">
              Home
            </a>
            <span className="w-0.5 h-5 bg-[var(--ink)] shrink-0" aria-hidden="true" />
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="min-h-[48px] px-2 sm:px-2.5 text-[var(--teal)] font-bold hover:underline flex items-center gap-1.5 whitespace-nowrap"
              >
                <IconBuilding className="w-4 h-4 shrink-0" />
                <span className="sm:hidden">Register</span>
                <span className="hidden sm:inline">Register Clinic</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="min-h-[48px] px-2 sm:px-2.5 text-[var(--teal)] font-bold hover:underline flex items-center gap-1.5 whitespace-nowrap"
              >
                <IconLock className="w-4 h-4 shrink-0" />
                <span>Sign In</span>
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
            <span className="inline-flex items-center gap-2 bg-[var(--yellow)] border-2 border-[var(--ink)] text-[var(--ink)] px-3.5 py-1 rounded-lg text-[16px] font-bold">
              Healthcare AI Assistant
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--ink)] mt-3 leading-tight break-words font-heading">
              Your clinic&apos;s 24/7 AI Receptionist.
            </h1>
            <p className="mt-4 text-[17px] text-[var(--ink)] leading-relaxed break-words">
              Parchi handles routine patient phone calls, WhatsApp inquiries, appointment bookings, and doctor wait-time updates in Hindi, Hinglish, Marathi, and English—freeing your staff to focus on in-clinic care.
            </p>
          </div>

          {/* Custom Editorial Desk Graphic */}
          <div className="card p-3 bg-[#FFF8E6]">
            <AuthReceptionIllustration />
          </div>

          {/* Key Pillars & Capabilities */}
          <div className="grid sm:grid-cols-2 gap-4 pt-1">
            <div className="bg-white border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--teal)] border-2 border-[var(--ink)] text-white flex items-center justify-center mb-2.5 shrink-0">
                <IconPhone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--ink)] text-[18px] break-words">Calls & WhatsApp</h3>
              <p className="text-[16px] text-[var(--ink)] mt-1 leading-normal break-words">
                Answers clinic hours, address, fee structure, and doctor availability in the language patients speak.
              </p>
            </div>

            <div className="bg-white border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] border-2 border-[var(--ink)] text-[#14532D] flex items-center justify-center mb-2.5 shrink-0">
                <IconLock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--ink)] text-[18px] break-words">Zero Double-Booking</h3>
              <p className="text-[16px] text-[var(--ink)] mt-1 leading-normal break-words">
                Strict database unique-slot verification. Appointments book only after explicit patient confirmation.
              </p>
            </div>

            <div className="bg-white border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--yellow)] border-2 border-[var(--ink)] text-[var(--ink)] flex items-center justify-center mb-2.5 shrink-0">
                <IconClock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--ink)] text-[18px] break-words">1-Tap Doctor Status</h3>
              <p className="text-[16px] text-[var(--ink)] mt-1 leading-normal break-words">
                Front desk marks doctor delays in 5 seconds. Patients asking &quot;doctor aaye kya?&quot; get accurate live updates.
              </p>
            </div>

            <div className="bg-white border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--red)] border-2 border-[var(--ink)] text-white flex items-center justify-center mb-2.5 shrink-0">
                <IconAlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--ink)] text-[18px] break-words">Safety & Triage Escalation</h3>
              <p className="text-[16px] text-[var(--ink)] mt-1 leading-normal break-words">
                Immediate 112 emergency routing for chest pain or trauma. Medical questions escalate safely to clinic staff.
              </p>
            </div>
          </div>

          {/* Small Backend Status Badge */}
          <div className="inline-flex items-center gap-2.5 bg-white border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] rounded-xl px-4 py-2 text-[16px] font-bold text-[var(--ink)] w-fit">
            <span
              className={`w-3 h-3 rounded-full border border-[var(--ink)] shrink-0 ${apiStatus === "ready"
                ? "bg-[#0F6B66]"
                : apiStatus === "waking"
                  ? "bg-[var(--yellow)] animate-pulse"
                  : "bg-[var(--red)]"
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
          <div className="flex items-center gap-3 text-[16px] text-[var(--ink)] bg-white border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] rounded-2xl p-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--teal)] border-2 border-[var(--ink)] flex items-center justify-center shrink-0">
              <IconShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="break-words">
              <strong>HIPAA & Indian Digital Health Guidelines:</strong> Patient telephone numbers and records are tenant-isolated. Strict opt-out compliance enforced.
            </span>
          </div>
        </section>

        {/* Right Column: Interactive Login & Signup Form */}
        <section className="lg:col-span-6 w-full max-w-xl mx-auto min-w-0">
          <div className="card p-5 sm:p-8">
            {/* Mode Selector Tabs */}
            <div className="flex rounded-xl bg-[var(--paper)] p-1.5 mb-6 border-2 border-[var(--ink)] gap-1.5" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                onClick={() => switchMode("login")}
                className={`min-h-[48px] flex-1 py-2.5 px-3 text-[16px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === "login"
                  ? "bg-[var(--teal)] text-white border-2 border-[var(--ink)]"
                  : "text-[var(--ink)] hover:bg-white"
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
                className={`min-h-[48px] flex-1 py-2.5 px-3 text-[16px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === "signup"
                  ? "bg-[var(--teal)] text-white border-2 border-[var(--ink)]"
                  : "text-[var(--ink)] hover:bg-white"
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
                className="mb-5 bg-[#FDECEA] border-2 border-[var(--red)] text-[#7A1E15] rounded-2xl p-4 text-[16px] flex items-start gap-2.5"
              >
                <IconAlertTriangle className="w-5 h-5 text-[var(--red)] shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{err}</div>
              </div>
            )}

            {successMsg && (
              <div
                role="status"
                className="mb-5 bg-[#DCFCE7] border-2 border-[#166534] text-[#14532D] rounded-2xl p-4 text-[16px] flex items-start gap-2.5"
              >
                <IconCheckCircle className="w-5 h-5 text-[#14532D] shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{successMsg}</div>
              </div>
            )}

            {/* TAB 1: LOGIN FORM */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--ink)] font-heading">Welcome Back</h2>
                  <p className="text-[16px] text-[#3C5250] mt-1">
                    Sign in to manage appointments, doctor status, and AI triage.
                  </p>
                </div>

                <div>
                  <label className="block text-[16px] font-semibold text-[var(--ink)] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3C5250]">
                      <IconMail className="w-5 h-5" />
                    </span>
                    <input
                      className="inp pl-11"
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
                    <label className="block text-[16px] font-semibold text-[var(--ink)]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="min-h-[48px] px-3 text-[16px] text-[var(--teal)] font-bold hover:underline flex items-center gap-1.5"
                    >
                      {showPassword ? (
                        <>
                          <IconEyeOff className="w-4 h-4" /> Hide
                        </>
                      ) : (
                        <>
                          <IconEye className="w-4 h-4" /> Show
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3C5250]">
                      <IconLock className="w-5 h-5" />
                    </span>
                    <input
                      className="inp pl-11"
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
                    className="btn w-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
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

                <div className="pt-4 border-t border-[#D4E2DF] text-center">
                  <p className="text-[16px] text-[#3C5250]">
                    Need a new clinic setup?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="min-h-[48px] px-2 text-[var(--teal)] font-bold hover:underline inline-flex items-center"
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
                  <h2 className="text-2xl font-bold text-[var(--ink)] font-heading">Register Your Clinic</h2>
                  <p className="text-[16px] text-[#3C5250] mt-1">
                    Set up your AI front desk in minutes. No credit card required.
                  </p>
                </div>

                {/* Clinic & Doctor Details */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[16px] font-semibold text-[var(--ink)] mb-1.5">
                      Clinic / Hospital Name *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3C5250]">
                        <IconBuilding className="w-5 h-5" />
                      </span>
                      <input
                        className="inp pl-11"
                        required
                        minLength={2}
                        placeholder="e.g. Apollo Care Clinic"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[16px] font-semibold text-[var(--ink)] mb-1.5">
                      Primary Doctor Name *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3C5250]">
                        <IconStethoscope className="w-5 h-5" />
                      </span>
                      <input
                        className="inp pl-11"
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
                    <label className="block text-[16px] font-semibold text-[var(--ink)] mb-1.5">
                      Medical Speciality
                    </label>
                    <select
                      className="inp"
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
                    <label className="block text-[16px] font-semibold text-[var(--ink)] mb-1.5">
                      Staff / WhatsApp Phone *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3C5250]">
                        <IconPhone className="w-5 h-5" />
                      </span>
                      <input
                        className="inp pl-11"
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
                    <label className="block text-[16px] font-semibold text-[var(--ink)] mb-1.5">
                      Owner Email *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3C5250]">
                        <IconMail className="w-5 h-5" />
                      </span>
                      <input
                        className="inp pl-11"
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
                      <label className="block text-[16px] font-semibold text-[var(--ink)]">
                        Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="min-h-[48px] px-3 text-[16px] text-[var(--teal)] font-bold hover:underline flex items-center gap-1.5"
                      >
                        {showPassword ? (
                          <>
                            <IconEyeOff className="w-4 h-4" /> Hide
                          </>
                        ) : (
                          <>
                            <IconEye className="w-4 h-4" /> Show
                          </>
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3C5250]">
                        <IconLock className="w-5 h-5" />
                      </span>
                      <input
                        className="inp pl-11"
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
                    <label className="block text-[16px] font-semibold text-[var(--ink)] mb-1.5">
                      Clinic Address & City
                    </label>
                    <input
                      className="inp"
                      placeholder="e.g. MG Road, Nagpur"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[16px] font-semibold text-[var(--ink)] mb-1.5">
                      Consultation Fees
                    </label>
                    <input
                      className="inp"
                      placeholder="e.g. Rs 300 (Followup Rs 200)"
                      value={fees}
                      onChange={(e) => setFees(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[16px] font-semibold text-[var(--ink)] mb-1.5">
                    Operating Hours
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3C5250]">
                      <IconCalendar className="w-5 h-5" />
                    </span>
                    <input
                      className="inp pl-11"
                      placeholder="e.g. Mon-Sat 9:00 AM - 7:00 PM"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                    />
                  </div>
                </div>

                {/* Non-medical advice & terms acknowledgement */}
                <div className="pt-1">
                  <label className="flex items-start gap-3 text-[16px] text-[var(--ink)] cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 rounded text-[var(--teal)] focus:ring-[var(--teal)] shrink-0"
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
                    className="btn w-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    disabled={busy}
                  >
                    {busy ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Registering Clinic…
                      </span>
                    ) : (
                      <>
                        Complete Clinic Registration
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-4 border-t border-[#D4E2DF] text-center">
                  <p className="text-[16px] text-[#3C5250]">
                    Already have a clinic account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="min-h-[48px] px-2 text-[var(--teal)] font-bold hover:underline inline-flex items-center"
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
      <footer className="w-full bg-[var(--ink)] text-white text-[16px] py-6 px-4 text-center sm:text-left border-t-2 border-[var(--ink)] mt-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
          <span className="flex items-center gap-2 justify-center sm:justify-start break-words">
            <span className="w-7 h-7 rounded-md bg-[var(--teal)] text-white flex items-center justify-center shrink-0 font-heading font-extrabold text-[15px]">
              P
            </span>
            <span>© {new Date().getFullYear()} Parchi AI · Automated Front Desk for Medical Practices</span>
          </span>
          <span className="text-[#E4EFED] break-words text-center lg:text-right">
            Administrative &amp; scheduling tool only · Telemedicine compliant
          </span>
        </div>
      </footer>
    </div>
  );
}
