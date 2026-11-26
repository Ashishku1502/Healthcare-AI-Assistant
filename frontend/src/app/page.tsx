import HeroDemo from "@/components/hero-demo";
import { IconArrowRight, IconCheckCircle, IconCross } from "@/components/icons";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-between bg-[var(--paper)] text-[var(--ink)] overflow-x-hidden">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 w-full bg-white/95 backdrop-blur-md border-b border-[#C8DAD7]">
        <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap" aria-label="Main">
          <a href="/" className="flex items-center gap-2.5 shrink-0 min-h-[48px]">
            <span className="w-10 h-10 rounded-xl bg-[var(--teal)] text-white flex items-center justify-center shrink-0">
              <IconCross className="w-5 h-5 text-white" />
            </span>
            <span className="font-heading text-[22px] font-extrabold text-[var(--ink)] tracking-tight">
              Parchi AI
            </span>
          </a>
          <div className="flex items-center gap-2.5 shrink-0">
            <a href="/receptionist" className="btn2 px-4 text-[16px]">
              Desk View
            </a>
            <a href="/login" className="btn px-4 text-[16px]">
              Sign In
            </a>
          </div>
        </nav>
      </header>

      {/* Section 1: Hero + Live Interactive Demo */}
      <section className="max-w-6xl mx-auto w-full px-4 py-8 sm:py-12 space-y-8">
        <div className="max-w-3xl space-y-4">
          <h1 className="font-heading text-[32px] sm:text-[44px] font-extrabold text-[var(--ink)] leading-[1.15]">
            Your clinic&rsquo;s automated front desk—honest wait times, safe triage.
          </h1>
          <p className="text-[18px] text-[#3C5250] leading-relaxed">
            Answers patient calls and WhatsApp messages from receptionist-confirmed live status. Never invents wait times and escalates red-flag symptoms straight to 112.
          </p>
        </div>

        <HeroDemo />
      </section>

      {/* Section 2: Pricing & 14-day Pilot */}
      <section id="pricing" className="max-w-3xl mx-auto w-full px-4 py-8 sm:py-12">
        <div className="card p-6 sm:p-8 space-y-5 text-center border-2 border-[var(--teal)]">
          <h2 className="font-heading text-[32px] sm:text-[38px] font-extrabold text-[var(--ink)]">
            ₹2,500/month
          </h2>
          <p className="text-[17px] text-[#3C5250]">
            Covers routine clinic hours, fees, address, live doctor wait updates, and pre-model emergency triage per location.
          </p>
          <ul className="text-left space-y-2.5 bg-[#F5F8F7] border border-[#C8DAD7] rounded-2xl p-4 text-[17px] text-[var(--ink)]">
            <li className="flex items-start gap-2.5">
              <IconCheckCircle className="w-5 h-5 text-[var(--teal)] shrink-0 mt-1" />
              <span>1-tap receptionist mobile page for live wait times and tokens</span>
            </li>
            <li className="flex items-start gap-2.5">
              <IconCheckCircle className="w-5 h-5 text-[var(--teal)] shrink-0 mt-1" />
              <span>Pre-model 112 red-flag safety gate and 90-day retention controls</span>
            </li>
          </ul>
          <a href="/signup" className="btn w-full sm:w-auto px-8 gap-2">
            <span>Start 14-day pilot</span>
            <IconArrowRight className="w-5 h-5 shrink-0" />
          </a>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="bg-[var(--ink)] text-white px-4 py-6 text-[16px]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <span className="font-semibold">© {new Date().getFullYear()} Parchi AI · Clinic Front Desk</span>
          <span className="text-[#D4E2DF]">Administrative assistant only. Does not replace doctors.</span>
        </div>
      </footer>
    </main>
  );
}
