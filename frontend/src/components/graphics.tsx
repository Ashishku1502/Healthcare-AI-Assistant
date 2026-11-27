import React from "react";

/**
 * Editorial vector scene for the Landing Hero.
 * Illustrates an automated clinic front desk: live parchi ticket, voice/WhatsApp waves, and verified status.
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
      <rect x="20" y="18" width="420" height="284" rx="22" fill="#E4F2F0" stroke="#1F2D2C" strokeWidth="3" />
      <circle cx="385" cy="72" r="46" fill="#F4B73F" stroke="#1F2D2C" strokeWidth="3" />
      <path d="M40 264H420" stroke="#1F2D2C" strokeWidth="3" strokeLinecap="round" />

      {/* Decorative Medical Cross Pattern */}
      <g opacity="0.25" stroke="#0F6B66" strokeWidth="3" strokeLinecap="round">
        <path d="M58 54V70M50 62H66" />
        <path d="M104 42V54M98 48H110" />
        <path d="M412 184V198M405 191H419" />
      </g>

      {/* Main Clinic Parchi Ticket Card */}
      <g>
        <rect x="52" y="84" width="234" height="190" rx="16" fill="#1F2D2C" transform="translate(5 5)" />
        <rect x="52" y="84" width="234" height="190" rx="16" fill="#FFFFFF" stroke="#1F2D2C" strokeWidth="3" />
        {/* Teal Header Strip */}
        <path d="M52 100C52 91.1634 59.1634 84 68 84H270C278.837 84 286 91.1634 286 100V122H52V100Z" fill="#0F6B66" stroke="#1F2D2C" strokeWidth="3" />
        <rect x="70" y="97" width="94" height="12" rx="6" fill="#FFFFFF" />
        <rect x="216" y="95" width="52" height="16" rx="8" fill="#F4B73F" stroke="#1F2D2C" strokeWidth="2" />

        {/* Doctor Row */}
        <circle cx="88" cy="154" r="18" fill="#E4F2F0" stroke="#1F2D2C" strokeWidth="2.5" />
        <path d="M88 144V164M78 154H98" stroke="#0F6B66" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="118" y="142" width="112" height="12" rx="6" fill="#1F2D2C" />
        <rect x="118" y="162" width="76" height="9" rx="4.5" fill="#0F6B66" />

        {/* Perforation Line + Notches */}
        <line x1="66" y1="196" x2="272" y2="196" stroke="#1F2D2C" strokeWidth="2.5" strokeDasharray="6 6" />
        <circle cx="52" cy="196" r="10" fill="#E4F2F0" stroke="#1F2D2C" strokeWidth="3" />
        <circle cx="286" cy="196" r="10" fill="#E4F2F0" stroke="#1F2D2C" strokeWidth="3" />

        {/* Token Display */}
        <text x="70" y="222" fill="#1F2D2C" fontSize="13" fontWeight="700" fontFamily="sans-serif">LIVE TOKEN</text>
        <text x="70" y="256" fill="#0F6B66" fontSize="34" fontWeight="900" fontFamily="sans-serif">#14</text>
        <rect x="176" y="224" width="90" height="32" rx="10" fill="#0F6B66" stroke="#1F2D2C" strokeWidth="2.5" />
        <text x="190" y="245" fill="#FFFFFF" fontSize="13" fontWeight="800" fontFamily="sans-serif">ON TIME</text>
      </g>

      {/* Patient Message Bubble (Right Side) */}
      <g>
        <rect x="262" y="42" width="166" height="62" rx="14" fill="#1F2D2C" transform="translate(4 4)" />
        <rect x="262" y="42" width="166" height="62" rx="14" fill="#FFFFFF" stroke="#1F2D2C" strokeWidth="3" />
        <circle cx="286" cy="73" r="12" fill="#0F6B66" stroke="#1F2D2C" strokeWidth="2" />
        <path d="M281 73L285 77L292 69" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="307" y="68" fill="#1F2D2C" fontSize="13" fontWeight="800" fontFamily="sans-serif">Doctor aaye kya?</text>
        <rect x="307" y="77" width="96" height="8" rx="4" fill="#F4B73F" />
      </g>

      {/* 112 Safety Shield Badge (Bottom Right) */}
      <g>
        <rect x="308" y="128" width="124" height="122" rx="18" fill="#1F2D2C" transform="translate(4 4)" />
        <rect x="308" y="128" width="124" height="122" rx="18" fill="#FFFFFF" stroke="#1F2D2C" strokeWidth="3" />
        <path
          d="M370 144L404 156V182C404 202 389 218 370 225C351 218 336 202 336 182V156L370 144Z"
          fill="#C23B2E"
          stroke="#1F2D2C"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <text x="370" y="191" textAnchor="middle" fill="#FFFFFF" fontSize="22" fontWeight="900" fontFamily="sans-serif">112</text>
        <text x="370" y="238" textAnchor="middle" fill="#1F2D2C" fontSize="12" fontWeight="800" fontFamily="sans-serif">SAFETY GATE</text>
      </g>
    </svg>
  );
}

/**
 * Custom graphic banner for the Auth Left Column (/login and /signup).
 * Shows multilingual voice & WhatsApp desk orchestration cleanly.
 */
export function AuthReceptionIllustration({ className = "w-full h-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 176"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="472" height="168" rx="18" fill="#0F6B66" stroke="#1F2D2C" strokeWidth="3" />
      {/* Subtle Grid Lines */}
      <path d="M4 58H476M4 116H476" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="2" />
      <path d="M160 4V172M320 4V172" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="2" />

      {/* Pill 1: Language Wave */}
      <rect x="24" y="26" width="176" height="54" rx="12" fill="#FFFFFF" stroke="#1F2D2C" strokeWidth="2.5" />
      <circle cx="48" cy="53" r="13" fill="#F4B73F" stroke="#1F2D2C" strokeWidth="2" />
      <path d="M44 49V57M48 46V60M52 50V56" stroke="#1F2D2C" strokeWidth="2.2" strokeLinecap="round" />
      <text x="70" y="49" fill="#1F2D2C" fontSize="13" fontWeight="800" fontFamily="sans-serif">4 Languages</text>
      <text x="70" y="66" fill="#0F6B66" fontSize="12" fontWeight="700" fontFamily="sans-serif">HI · EN · MR · HINGLISH</text>

      {/* Pill 2: Live Ticket */}
      <rect x="24" y="96" width="176" height="54" rx="12" fill="#FFF8E6" stroke="#1F2D2C" strokeWidth="2.5" />
      <rect x="38" y="110" width="38" height="26" rx="7" fill="#0F6B66" stroke="#1F2D2C" strokeWidth="2" />
      <text x="57" y="128" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">#14</text>
      <text x="86" y="120" fill="#1F2D2C" fontSize="13" fontWeight="800" fontFamily="sans-serif">Live Desk Sync</text>
      <text x="86" y="137" fill="#3C5250" fontSize="12" fontWeight="700" fontFamily="sans-serif">Voice + WhatsApp</text>

      {/* Right Desk Card Mock */}
      <rect x="224" y="22" width="228" height="132" rx="14" fill="#FFFFFF" stroke="#1F2D2C" strokeWidth="3" />
      <rect x="240" y="38" width="90" height="22" rx="7" fill="#F4B73F" stroke="#1F2D2C" strokeWidth="2" />
      <text x="285" y="53" textAnchor="middle" fill="#1F2D2C" fontSize="12" fontWeight="800" fontFamily="sans-serif">VERIFIED</text>
      <circle cx="426" cy="49" r="11" fill="#0F6B66" stroke="#1F2D2C" strokeWidth="2" />
      <path d="M421 49L425 53L432 45" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="240" y="74" width="196" height="28" rx="8" fill="#E4F2F0" stroke="#1F2D2C" strokeWidth="2" />
      <text x="252" y="93" fill="#1F2D2C" fontSize="13" fontWeight="800" fontFamily="sans-serif">Slot 10:30 AM Confirmed</text>

      <rect x="240" y="112" width="132" height="26" rx="8" fill="#C23B2E" stroke="#1F2D2C" strokeWidth="2" />
      <text x="306" y="129" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="800" fontFamily="sans-serif">112 RED-FLAG GATE</text>
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
