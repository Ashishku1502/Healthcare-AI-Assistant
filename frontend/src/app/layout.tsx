import "./globals.css";

export const metadata = {
  title: "Parchi AI — Smart Front Desk for Clinics",
  description: "AI receptionist for clinic phone calls, WhatsApp, and patient appointment management.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
