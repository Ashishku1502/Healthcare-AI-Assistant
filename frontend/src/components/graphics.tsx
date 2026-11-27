import React from "react";

/**
 * Editorial vector scene for the Landing Hero.
 * Illustrates an automated clinic front desk: live parchi ticket, patient query bubble, and 112 safety shield.
 */
export function ClinicHeroScene({ className = "w-full h-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 460 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background Warm Accent Shapes */}
      <rect x="16" y="16" width="428" height="288" rx="22" fill="#E4F2F0" stroke="#1F2D2C" strokeWidth="3" />
      <circle cx="386" cy="72" r="44" fill="#F4B73F" stroke="#1F2D2C" strokeWidth="3" />
      <path d="M36 276H424" stroke="#1F2D2C" strokeWidth="3" strokeLinecap="round" />

      {/* Decorative Medical Cross Pattern */}
      <g opacity="0.28" stroke="#0F6B66" strokeWidth="3.5" strokeLinecap="round">
        <path d="M52 50V66M44 58H60" />
        <path d="M98 38V50M92 44H104" />
      </g>

      {/* Main Clinic Parchi Ticket Card */}
      <g>
        <rect x="44" y="84" width="238" height="190" rx="16" fill="#1F2D2C" transform="translate(5 5)" />
        <rect x="44" y="84" width="238" height="190" rx="16" fill="#FFFFFF" stroke="#1F2D2C" strokeWidth="3" />
        {/* Teal Header Strip */}
        <path
          d="M44 100C44 91.1634 51.1634 84 60 84H266C274.837 84 282 91.1634 282 100V122H44V100Z"
          fill="#0F6B66"
          stroke="#1F2D2C"
          strokeWidth="3"
        />
        <rect x="62" y="97" width="96" height="12" rx="6" fill="#FFFFFF" />
        <rect x="212" y="95" width="52" height="16" rx="8" fill="#F4B73F" stroke="#1F2D2C" strokeWidth="2" />

        {/* Doctor Row */}
        <circle cx="80" cy="154" r="18" fill="#E4F2F0" stroke="#1F2D2C" strokeWidth="2.5" />
        <path d="M80 144V164M70 154H90" stroke="#0F6B66" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="110" y="142" width="120" height="12" rx="6" fill="#1F2D2C" />
        <rect x="110" y="162" width="84" height="9" rx="4.5" fill="#0F6B66" />

        {/* Perforation Line + Notches */}
        <line x1="58" y1="196" x2="268" y2="196" stroke="#1F2D2C" strokeWidth="2.5" strokeDasharray="6 6" />
        <circle cx="44" cy="196" r="10" fill="#E4F2F0" stroke="#1F2D2C" strokeWidth="3" />
        <circle cx="282" cy="196" r="10" fill="#E4F2F0" stroke="#1F2D2C" strokeWidth="3" />

        {/* Token Display */}
        <text x="62" y="220" fill="#1F2D2C" fontSize="16" fontWeight="700" fontFamily="sans-serif">TOKEN</text>
        <text x="62" y="258" fill="#0F6B66" fontSize="36" fontWeight="900" fontFamily="sans-serif">#14</text>
        <rect x="160" y="222" width="106" height="36" rx="10" fill="#0F6B66" stroke="#1F2D2C" strokeWidth="2.5" />
        <text x="213" y="246" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="800" fontFamily="sans-serif">ON TIME</text>
      </g>

      {/* Patient Message Bubble (Right Side) */}
      <g>
        <rect x="242" y="34" width="190" height="68" rx="14" fill="#1F2D2C" transform="translate(4 4)" />
        <rect x="242" y="34" width="190" height="68" rx="14" fill="#FFFFFF" stroke="#1F2D2C" strokeWidth="3" />
        <circle cx="268" cy="68" r="13" fill="#0F6B66" stroke="#1F2D2C" strokeWidth="2" />
        <path d="M262 68L266 72L274 64" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="290" y="64" fill="#1F2D2C" fontSize="16" fontWeight="800" fontFamily="sans-serif">Doctor aaye?</text>
        <rect x="290" y="75" width="116" height="9" rx="4.5" fill="#F4B73F" />
      </g>

      {/* 112 Safety Shield Badge (Bottom Right) */}
      <g>
        <rect x="304" y="124" width="130" height="136" rx="18" fill="#1F2D2C" transform="translate(4 4)" />
        <rect x="304" y="124" width="130" height="136" rx="18" fill="#FFFFFF" stroke="#1F2D2C" strokeWidth="3" />
        <path
          d="M369 140L405 153V180C405 201 389 217 369 224C349 217 333 201 333 180V153L369 140Z"
          fill="#C23B2E"
          stroke="#1F2D2C"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <text x="369" y="191" textAnchor="middle" fill="#FFFFFF" fontSize="24" fontWeight="900" fontFamily="sans-serif">112</text>
        <text x="369" y="246" textAnchor="middle" fill="#1F2D2C" fontSize="16" fontWeight="800" fontFamily="sans-serif">SAFE GATE</text>
      </g>
    </svg>
  );
}

/**
 * Custom graphic banner for the Auth Left Column (/login and /signup).
 * Shows multilingual voice & WhatsApp desk orchestration cleanly with generous text padding.
 */
export function AuthReceptionIllustration({ className = "w-full h-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 184"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="472" height="176" rx="18" fill="#0F6B66" stroke="#1F2D2C" strokeWidth="3" />
      {/* Subtle Grid Lines */}
      <path d="M4 62H476M4 122H476" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="2" />
      <path d="M160 4V180M320 4V180" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="2" />

      {/* Pill 1: Language Wave */}
      <rect x="20" y="22" width="194" height="62" rx="12" fill="#FFFFFF" stroke="#1F2D2C" strokeWidth="2.5" />
      <circle cx="46" cy="53" r="14" fill="#F4B73F" stroke="#1F2D2C" strokeWidth="2" />
      <path d="M42 49V57M46 46V60M50 50V56" stroke="#1F2D2C" strokeWidth="2.4" strokeLinecap="round" />
      <text x="70" y="48" fill="#1F2D2C" fontSize="16" fontWeight="800" fontFamily="sans-serif">4 Languages</text>
      <text x="70" y="69" fill="#0F6B66" fontSize="16" fontWeight="700" fontFamily="sans-serif">HI · EN · MR</text>

      {/* Pill 2: Live Ticket */}
      <rect x="20" y="98" width="194" height="62" rx="12" fill="#FFF8E6" stroke="#1F2D2C" strokeWidth="2.5" />
      <rect x="34" y="114" width="42" height="30" rx="8" fill="#0F6B66" stroke="#1F2D2C" strokeWidth="2" />
      <text x="55" y="135" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="900" fontFamily="sans-serif">#14</text>
      <text x="86" y="125" fill="#1F2D2C" fontSize="16" fontWeight="800" fontFamily="sans-serif">Live Sync</text>
      <text x="86" y="146" fill="#2F4442" fontSize="16" fontWeight="700" fontFamily="sans-serif">Voice + Chat</text>

      {/* Right Desk Card Mock */}
      <rect x="230" y="22" width="230" height="138" rx="14" fill="#FFFFFF" stroke="#1F2D2C" strokeWidth="3" />
      <rect x="246" y="36" width="106" height="26" rx="8" fill="#F4B73F" stroke="#1F2D2C" strokeWidth="2" />
      <text x="299" y="54" textAnchor="middle" fill="#1F2D2C" fontSize="16" fontWeight="800" fontFamily="sans-serif">VERIFIED</text>
      <circle cx="430" cy="49" r="12" fill="#0F6B66" stroke="#1F2D2C" strokeWidth="2" />
      <path d="M424 49L428 53L436 45" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="246" y="74" width="198" height="32" rx="8" fill="#E4F2F0" stroke="#1F2D2C" strokeWidth="2" />
      <text x="258" y="96" fill="#1F2D2C" fontSize="16" fontWeight="800" fontFamily="sans-serif">Slot Confirmed</text>

      <rect x="246" y="116" width="144" height="30" rx="8" fill="#C23B2E" stroke="#1F2D2C" strokeWidth="2" />
      <text x="318" y="136" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="800" fontFamily="sans-serif">112 SAFETY</text>
    </svg>
  );
}

/**
 * Compact spot graphic for empty missed calls / zero open handoffs states.
 */
export function EmptyDeskIllustration({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl bg-[#EAF4F2] border-2 border-[var(--ink)] p-4 flex items-center gap-3.5">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-12 h-12 shrink-0"
        aria-hidden="true"
      >
        <rect x="6" y="6" width="52" height="52" rx="14" fill="#FFFFFF" stroke="#1F2D2C" strokeWidth="3" />
        <circle cx="32" cy="32" r="16" fill="#F4B73F" stroke="#1F2D2C" strokeWidth="2.5" />
        <path d="M25 32L30 37L40 26" stroke="#1F2D2C" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="min-w-0">
        <p className="text-[17px] font-bold text-[var(--ink)] leading-snug">{title}</p>
        {subtitle && <p className="text-[16px] text-[#2F4442] leading-snug">{subtitle}</p>}
      </div>
    </div>
  );
}
