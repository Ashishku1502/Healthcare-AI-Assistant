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
    desc: "Answers routine questions about hours, address, fees and doctor availability in real-time.",
    icon: IconPhone,
    color: "bg-purple-100 text-brand",
  },
  {
    title: "Appointments",
    desc: "Books only after the patient confirms; the server strictly blocks accidental double-booking.",
    icon: IconCalendar,
    color: "bg-green-100 text-ok",
  },
  {
    title: "Hindi · Hinglish · English",
    desc: "Replies in the language the patient speaks or types with native natural phrasing.",
    icon: IconMessageSquare,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Safe Handoff & Triage",
    desc: "Urgent questions route to 112 or clinic staff. Parchi never provides medical diagnoses.",
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

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-between overflow-x-hidden">
      {/* Navigation */}
      <nav className="flex items-center justify-between max-w-6xl mx-auto w-full p-4 gap-2" aria-label="Main">
        <a href="/" className="flex items-center gap-2.5 group shrink-0">
          <span className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <IconCross className="w-5 h-5 text-white" />
          </span>
          <span className="text-lg sm:text-xl font-bold text-deep tracking-tight">Parchi AI</span>
        </a>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a
            className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-brand px-2 sm:px-3 py-2 transition-colors whitespace-nowrap"
            href="/login"
          >
            Sign In
          </a>
          <a
            className="btn text-xs sm:text-sm py-2 px-3 sm:px-4 shadow-sm flex items-center gap-1.5 whitespace-nowrap"
            href="/signup"
          >
            <span>Register Clinic</span>
            <IconArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto w-full px-4 py-8 sm:py-12 grid md:grid-cols-2 gap-8 items-center min-w-0">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 bg-lav text-brand rounded-full px-3 py-1 text-xs sm:text-sm font-semibold">
            <IconSparkles className="w-4 h-4 text-brand shrink-0" />
            AI front desk for clinics
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-deep mt-4 leading-tight sm:leading-snug break-words">
            Your clinic’s AI receptionist—always ready.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-700 leading-relaxed break-words">
            Parchi answers routine patient calls and WhatsApp messages, helps with appointments, and keeps your clinic team informed—so fewer patients are left waiting.
          </p>
          <div className="mt-6 flex gap-3 flex-wrap items-center">
            <a className="btn shadow-md flex items-center gap-2 text-sm sm:text-base px-5 py-2.5" href="/signup">
              <span>Register Your Clinic</span>
              <IconArrowRight className="w-4 h-4 shrink-0" />
            </a>
            <a className="btn2 text-sm sm:text-base px-5 py-2.5" href="/login">
              Sign In (Demo)
            </a>
            <a className="btn2 text-sm sm:text-base px-4 py-2.5" href="#pricing">
              See pricing
            </a>
          </div>
        </div>

        {/* Chat Preview Card */}
        <div className="card bg-lav border border-purple-200 shadow-sm min-w-0" aria-label="Chat preview (illustration)">
          <div className="flex items-center justify-between border-b border-purple-200/60 pb-2 mb-3 gap-2">
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-3 h-3 rounded-full bg-ok animate-pulse shrink-0"></span>
              <span className="text-xs font-bold text-deep uppercase tracking-wider">AI Receptionist Live</span>
            </div>
            <span className="text-[11px] text-gray-500 whitespace-nowrap">WhatsApp & Call Preview</span>
          </div>
          <div className="space-y-2.5">
            <div className="bg-white rounded-2xl p-3.5 w-fit max-w-[88%] shadow-xs text-sm break-words">
              <p className="font-medium text-gray-800">Doctor kab available hai?</p>
              <span className="text-[10px] text-gray-400 block mt-1">10:14 AM · Patient</span>
            </div>
            <div className="bg-brand text-white rounded-2xl p-3.5 w-fit max-w-[88%] ml-auto shadow-xs text-sm break-words">
              <p>Dr. Sharma kal 10:00 AM se available hain. Book karein?</p>
              <span className="text-[10px] text-purple-200 block text-right mt-1">10:14 AM · Parchi AI</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-4 pt-2 border-t border-purple-200/60 break-words">
            <IconShieldCheck className="w-4 h-4 text-brand shrink-0" />
            <span>Server-enforced booking confirmation protocol</span>
          </div>
        </div>
      </section>

      {/* Feature Grid with SVG Icons */}
      <section className="max-w-6xl mx-auto w-full px-4 py-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div className="card hover:shadow-md transition-shadow min-w-0" key={f.title}>
              <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-3 shrink-0`}>
                <Icon className="w-5 h-5 shrink-0" />
              </div>
              <h2 className="font-bold text-deep text-base break-words">{f.title}</h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed break-words">{f.desc}</p>
            </div>
          );
        })}
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-xl mx-auto w-full px-4 py-12">
        <div className="card text-center border-2 border-brand/20 p-6 sm:p-8 shadow-sm min-w-0">
          <div className="inline-block bg-lav text-brand rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider mb-2">
            Simple Flat Rate
          </div>
          <h2 className="text-3xl font-extrabold text-deep break-words">₹2,500 / month</h2>
          <p className="text-sm font-medium text-gray-600 mt-1">per clinic location</p>
          <p className="mt-3 text-sm text-gray-600 break-words leading-relaxed">
            Unlimited automated responses for routine hours, fees, address, and live doctor wait-time announcements.
          </p>
          <a className="btn mt-5 px-8 shadow-md inline-flex items-center gap-2" href="/signup">
            <span>Register Clinic Free</span>
            <IconArrowRight className="w-4 h-4 shrink-0" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-deep text-white text-xs p-6 text-center border-t border-white/10 mt-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <span className="flex items-center gap-1.5 justify-center sm:justify-start break-words">
            <span className="w-5 h-5 rounded-md bg-brand text-white flex items-center justify-center shrink-0">
              <IconCross className="w-3.5 h-3.5 text-white" />
            </span>
            <span>© {new Date().getFullYear()} Parchi AI · Automated Front Desk for Clinics</span>
          </span>
          <span className="text-purple-200/80 break-words">Administrative front-desk assistant only. Does not replace doctors.</span>
        </div>
      </footer>
    </main>
  );
}
