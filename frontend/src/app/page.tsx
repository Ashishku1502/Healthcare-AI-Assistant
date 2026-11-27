import HeroDemo from "@/components/hero-demo";
import {
  IconArrowRight,
  IconCheckCircle,
  IconClock,
  IconCross,
  IconLock,
  IconShieldCheck,
} from "@/components/icons";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-between bg-[var(--paper)] text-[var(--ink)] overflow-x-hidden">
      {/* Top Navigation */}
      <header className="sticky top-0 z-20 w-full bg-white border-b-2 border-[var(--ink)]">
        <nav
          className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2 flex-wrap"
          aria-label="Main"
        >
          <a href="/" className="flex items-center gap-2.5 shrink-0 min-h-[48px]">
            <span className="w-10 h-10 rounded-xl bg-[var(--teal)] border-2 border-[var(--ink)] text-white flex items-center justify-center shrink-0">
              <IconCross className="w-5 h-5 text-white" />
            </span>
            <div className="flex items-center gap-2">
              <span className="font-heading text-[22px] font-extrabold text-[var(--ink)] tracking-tight whitespace-nowrap">
                Parchi AI
              </span>
              <span className="hidden md:inline-block px-3 py-0.5 rounded-lg bg-[var(--yellow)] border-2 border-[var(--ink)] text-[var(--ink)] text-[16px] font-bold whitespace-nowrap">
                Clinic Front Desk
              </span>
            </div>
          </a>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <a
              href="#pricing"
              className="hidden sm:inline-flex items-center min-h-[48px] px-3 text-[16px] font-bold text-[var(--ink)] hover:text-[var(--teal)] whitespace-nowrap"
            >
              Pricing
            </a>
            <a href="/login" className="btn2 px-4 text-[16px] whitespace-nowrap">
              Sign In
            </a>
            <a href="/signup" className="btn px-4 text-[16px] whitespace-nowrap">
              Start pilot
            </a>
          </div>
        </nav>
      </header>

      {/* Section 1: Hero + Value Highlights + Live Interactive Demo */}
      <section className="max-w-6xl mx-auto w-full px-3 sm:px-6 py-8 sm:py-12 space-y-8">
        <div className="grid lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-8 space-y-4">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-lg bg-[var(--yellow)] border-2 border-[var(--ink)] text-[var(--ink)] text-[16px] font-bold">
              Hindi, Hinglish, Marathi &amp; English
            </span>
            <h1 className="font-heading text-[32px] sm:text-[46px] font-extrabold text-[var(--ink)] leading-[1.12]">
              Your clinic&rsquo;s automated front desk—honest wait times, safe triage.
            </h1>
            <p className="text-[18px] text-[var(--ink)] leading-relaxed max-w-2xl">
              Answers patient calls and WhatsApp questions from receptionist-confirmed status. Never guesses doctor delays and routes red-flag symptoms straight to 112.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <a href="/signup" className="btn px-7 gap-2">
                <span>Start 14-day pilot</span>
                <IconArrowRight className="w-5 h-5 shrink-0" />
              </a>
              <a href="#live-demo" className="btn2 px-6">
                Try live patient demo
              </a>
            </div>
          </div>

          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
            <div className="bg-white border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] rounded-xl p-3.5 flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-[var(--teal)] border-2 border-[var(--ink)] text-white flex items-center justify-center shrink-0">
                <IconClock className="w-5 h-5" />
              </span>
              <span className="text-[16px] font-bold text-[var(--ink)]">1-tap live status</span>
            </div>
            <div className="bg-white border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] rounded-xl p-3.5 flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-[var(--yellow)] border-2 border-[var(--ink)] text-[var(--ink)] flex items-center justify-center shrink-0">
                <IconLock className="w-5 h-5" />
              </span>
              <span className="text-[16px] font-bold text-[var(--ink)]">Confirmed slot booking</span>
            </div>
            <div className="bg-white border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] rounded-xl p-3.5 flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-[var(--red)] border-2 border-[var(--ink)] text-white flex items-center justify-center shrink-0">
                <IconShieldCheck className="w-5 h-5" />
              </span>
              <span className="text-[16px] font-bold text-[var(--ink)]">Pre-model 112 safety</span>
            </div>
          </div>
        </div>

        <HeroDemo />
      </section>

      {/* Section 2: Pricing & 14-day Pilot */}
      <section id="pricing" className="max-w-5xl mx-auto w-full px-3 sm:px-6 py-8 sm:py-12">
        <div className="card p-6 sm:p-8 grid md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 space-y-3 text-center md:text-left">
            <span className="inline-block px-3.5 py-1 rounded-lg bg-[var(--yellow)] border-2 border-[var(--ink)] text-[var(--ink)] text-[16px] font-bold">
              Simple Clinic Plan
            </span>
            <h2 className="font-heading text-[34px] sm:text-[42px] font-extrabold text-[var(--ink)] leading-tight">
              ₹2,500/month
            </h2>
            <p className="text-[17px] text-[var(--ink)]">
              Per clinic location. Covers front-desk calls, WhatsApp updates, and receptionist controls.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 justify-center md:justify-start">
              <a href="/signup" className="btn px-6 gap-2">
                <span>Start 14-day pilot</span>
                <IconArrowRight className="w-5 h-5 shrink-0" />
              </a>
            </div>
          </div>

          <ul className="md:col-span-7 space-y-3 bg-[var(--paper)] border-2 border-[var(--ink)] rounded-xl p-5 text-[17px] text-[var(--ink)]">
            <li className="flex items-start gap-2.5">
              <IconCheckCircle className="w-5 h-5 text-[var(--teal)] shrink-0 mt-1" />
              <span>1-tap 360px receptionist page for doctor status and live token queue</span>
            </li>
            <li className="flex items-start gap-2.5">
              <IconCheckCircle className="w-5 h-5 text-[var(--teal)] shrink-0 mt-1" />
              <span>Answers hours, address, fees, and confirmed slots in 4 languages</span>
            </li>
            <li className="flex items-start gap-2.5">
              <IconCheckCircle className="w-5 h-5 text-[var(--teal)] shrink-0 mt-1" />
              <span>Pre-model 112 red-flag safety gate and 90-day retention controls</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--ink)] text-white px-4 py-6 text-[16px]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <span className="font-semibold">© {new Date().getFullYear()} Parchi AI · Clinic Front Desk</span>
          <span className="text-[#E4EFED]">Administrative assistant only. Does not replace doctors.</span>
        </div>
      </footer>
    </main>
  );
}
