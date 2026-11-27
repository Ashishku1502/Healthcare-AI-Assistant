import "./globals.css";
import { Mukta, Bricolage_Grotesque } from "next/font/google";

const mukta = Mukta({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-mukta",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata = {
  title: "Parchi AI — Clinic Front Desk",
  description: "Automated clinic assistant for live wait updates, safe emergency triage, and patient scheduling.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mukta.variable} ${bricolage.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("parchi-theme")||"modern";document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans bg-paper text-ink">{children}</body>
    </html>
  );
}
