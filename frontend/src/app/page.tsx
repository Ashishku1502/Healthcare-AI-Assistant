import {
  IconCross,
  IconPhone,
  IconCalendar,
  IconMessageSquare,
  IconShieldCheck,
  IconActivity,
  IconCheckCircle,
  IconArrowRight,
  IconSparkles,
} from "@/components/icons";

const features = [
  {
    title: "Calls & WhatsApp",
    desc: "Answers routine questions about hours, address, fees, and doctor availability in real time.",
    icon: IconPhone,
    color: "bg-purple-100 text-brand",
  },
  {
    title: "Appointments",
    desc: "Books only after the patient confirms; the server strictly blocks accidental double-booking.",
    icon: IconCalendar,
    color: "bg-emerald-100 text-ok",
  },
  {
    title: "Hindi · Hinglish · Marathi · English",
    desc: "Replies in the language the patient speaks or types with native natural phrasing.",
    icon: IconMessageSquare,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Safe Handoff & Triage",
    desc: "Pre-model safety gate routes red-flag symptoms to 112 and clinic staff. Never diagnoses.",
    icon: IconShieldCheck,
    color: "bg-red-100 text-red-600",
  },
  {
    title: "Simple Analytics",
    desc: "One row per patient contact, measured from actual calls and message events.",
    icon: IconActivity,
    color: "bg-amber-100 text-amber-700",
  },
  {
    title: "Clinic-Approved Facts",
    desc: "Answers come strictly from doctor schedules and facts your clinic administration enters.",
    icon: IconCheckCircle,
    color: "bg-teal-100 text-teal-700",
  },
];

const pilotIncludes = [
  "1-tap mobile receptionist status & live token queue",
  "Pre-model 112 safety check & clinical advice refusal",
  "Voice (<2 sentences, zero button menus) & WhatsApp",
  "DPDP consent line & 90-day retention controls",
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-between overflow-x-hidden">
      {/* Sticky Translucent Navigation */}
      <header className="sticky top-0 z-20 w-full bg-white/85 backdrop-blur-md border-b border-lav">
        <nav className="flex items-center justify-between max-w-6xl mx-auto w-full px-4 py-3 gap-2" aria-label="Main">
          <a href="/" className="flex items-center gap-2.5 group shrink-0">
            <span className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <IconCross className="w-5 h-5 text-white" />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-extrabold text-deep tracking-tight">Parchi AI</span>
              <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-wider bg-lav text-brand px-2 py-0.5 rounded-full">
                Clinic Front Desk
              </span>
            </div>
          </a>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <a
              className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-brand px-2.5 sm:px-3 py-2 rounded-full hover:bg-lav/60 transition-colors whitespace-nowrap"
              href="/login"
            >
              Sign In
            </a>
            <a
              className="btn text-xs sm:text-sm !min-h-[38px] py-1.5 px-3.5 sm:px-4 shadow-sm flex items-center gap-1.5 whitespace-nowrap"
              href="/signup"
            >
              <span>Register Clinic</span>
              <IconArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            </a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto w-full px-4 py-10 sm:py-16 grid lg:grid-cols-12 gap-8 lg:gap-10 items-center min-w-0">
        <div className="lg:col-span-6 min-w-0">
          <p className="inline-flex items-center gap-1.5 bg-lav border border-purple-200/80 text-brand rounded-full px-3.5 py-1 text-xs sm:text-sm font-bold">
            <IconSparkles className="w-4 h-4 text-brand shrink-0" />
            AI front desk for clinics
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-deep mt-4 leading-[1.15] tracking-tight break-words">
            Your clinic’s AI receptionist—always ready.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-700 leading-relaxed break-words">
            Parchi answers routine patient calls and WhatsApp messages, helps with appointments, and shares verified live wait times—so fewer patients are left waiting.
          </p>

          {/* Trust Pills */}
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-deep">
            <span className="inline-flex items-center gap-1.5 bg-white border border-lav px-3 py-1 rounded-full shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              30-min live wait truth
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white border border-lav px-3 py-1 rounded-full shadow-xs">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              112 emergency gate
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white border border-lav px-3 py-1 rounded-full shadow-xs">
              <span className="w-2 h-2 rounded-full bg-brand"></span>
              4 languages
            </span>
          </div>

          <div className="mt-7 flex gap-3 flex-wrap items-center">
            <a className="btn shadow-md hover:shadow-lg flex items-center gap-2 text-sm sm:text-base px-6 py-2.5" href="/signup">
              <span>Register Your Clinic</span>
              <IconArrowRight className="w-4 h-4 shrink-0" />
            </a>
            <a className="btn2 text-sm sm:text-base px-5 py-2.5" href="/login">
              Sign In (Demo)
            </a>
            <a className="text-sm font-semibold text-brand hover:underline px-2 py-2" href="#pricing">
              See pricing →
            </a>
          </div>
        </div>

        {/* Wait-Time Conversation Preview Card */}
        <div className="lg:col-span-6 min-w-0">
          <div className="card bg-gradient-to-br from-lav via-purple-50 to-white border border-purple-200/80 shadow-md min-w-0" aria-label="Chat preview (illustration)">
            <div className="flex items-center justify-between border-b border-purple-200/70 pb-3 mb-4 gap-2">
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="text-xs font-extrabold text-deep uppercase tracking-wider">AI Receptionist Live</span>
              </div>
              <span className="text-[11px] font-semibold text-brand bg-white border border-purple-200 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                WhatsApp &amp; Call Preview
              </span>
            </div>

            <div className="space-y-3">
              {/* Patient question */}
              <div className="bg-white border border-purple-100 rounded-2xl rounded-tl-sm p-3.5 w-fit max-w-[88%] shadow-xs text-sm break-words">
                <p className="font-semibold text-gray-800">Doctor aa gaye kya? Kitna wait hai?</p>
                <span className="text-[10px] text-gray-400 block mt-1">10:22 AM · Patient</span>
              </div>

              {/* AI — fresh state response */}
              <div className="bg-brand text-white rounded-2xl rounded-tr-sm p-3.5 w-fit max-w-[90%] ml-auto shadow-sm text-sm break-words">
                <p>Dr. Neha Sharma is running 15 minutes late (confirmed by clinic 8 mins ago). Current token: #12.</p>
                <span className="text-[10px] text-purple-200 block text-right mt-1">10:22 AM · Parchi AI</span>
              </div>

              {/* AI — stale / unconfirmed fallback badge */}
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 w-fit max-w-[92%] ml-auto text-xs text-amber-900 break-words shadow-xs">
                <span className="font-bold text-amber-950">Unconfirmed fallback</span> — if receptionist hasn&rsquo;t tapped in 30+ min: &ldquo;Status unconfirmed — I can issue a token or arrange a callback.&rdquo;
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mt-4 pt-3 border-t border-purple-200/70 break-words">
              <IconShieldCheck className="w-4 h-4 text-brand shrink-0" />
              <span>Server-enforced: wait time only from receptionist live state</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto w-full px-4 py-8 sm:py-12">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Core Capabilities</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-deep mt-1">
            Built for busy clinic reception desks
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                className="card hover:shadow-md hover:border-purple-300 transition-all min-w-0 group"
                key={f.title}
              >
                <div className={`w-11 h-11 rounded-2xl ${f.color} flex items-center justify-center mb-3.5 shrink-0 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5 shrink-0" />
                </div>
                <h3 className="font-bold text-deep text-base break-words">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed break-words">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-xl mx-auto w-full px-4 py-12">
        <div className="card text-center border-2 border-brand/25 p-6 sm:p-9 shadow-md min-w-0 bg-gradient-to-b from-white to-lav/30">
          <div className="inline-block bg-lav text-brand rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider mb-3">
            Simple Flat Rate
          </div>
          <h2 className="text-4xl font-extrabold text-deep break-words">₹2,500 <span className="text-base font-semibold text-gray-500">/ month</span></h2>
          <p className="text-sm font-medium text-gray-600 mt-1">per clinic location</p>
          <p className="mt-3 text-sm text-gray-700 break-words leading-relaxed">
            Covers routine hours, fees, address, and live doctor wait-time announcements.
          </p>

          <ul className="mt-5 text-left space-y-2 bg-white border border-lav rounded-2xl p-4 text-xs sm:text-sm text-gray-700">
            {pilotIncludes.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <IconCheckCircle className="w-4 h-4 text-ok shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <a className="btn mt-6 px-8 w-full sm:w-auto shadow-md hover:shadow-lg inline-flex items-center gap-2" href="/signup">
            <span>Start 14-day pilot</span>
            <IconArrowRight className="w-4 h-4 shrink-0" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-deep text-white text-xs p-6 text-center border-t border-white/10 mt-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <span className="flex items-center gap-2 justify-center sm:justify-start break-words">
            <span className="w-6 h-6 rounded-lg bg-brand text-white flex items-center justify-center shrink-0">
              <IconCross className="w-3.5 h-3.5 text-white" />
            </span>
            <span className="font-semibold">© {new Date().getFullYear()} Parchi AI · Automated Front Desk for Clinics</span>
          </span>
          <span className="text-purple-200/80 break-words">Administrative front-desk assistant only. Does not replace doctors.</span>
        </div>
      </footer>
    </main>
  );
}
