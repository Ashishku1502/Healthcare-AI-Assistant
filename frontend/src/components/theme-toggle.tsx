"use client";

import { useEffect, useState } from "react";
import { IconSparkles, IconPalette, IconMoon } from "@/components/icons";

export type ThemeType = "modern" | "editorial" | "dark";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeType>("modern");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = (localStorage.getItem("parchi-theme") as ThemeType) || "modern";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const switchTheme = (nextTheme: ThemeType) => {
    setTheme(nextTheme);
    localStorage.setItem("parchi-theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const cycleTheme = () => {
    const order: ThemeType[] = ["modern", "editorial", "dark"];
    const nextIdx = (order.indexOf(theme) + 1) % order.length;
    switchTheme(order[nextIdx]);
  };

  if (!mounted) {
    return (
      <div className={`h-[44px] w-[110px] rounded-xl bg-white/40 animate-pulse border border-[var(--ink)]/20 ${className}`} />
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 bg-white dark:bg-slate-800 border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] rounded-xl p-1 text-[14px] font-bold ${className}`}>
      <button
        type="button"
        onClick={() => switchTheme("modern")}
        title="New Modern Style (Default)"
        aria-label="New Modern Style"
        className={`min-h-[38px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
          theme === "modern"
            ? "bg-[var(--teal)] text-white shadow-sm"
            : "text-[var(--ink)] hover:bg-[#E4F2F0]"
        }`}
      >
        <IconSparkles className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Modern</span>
      </button>

      <button
        type="button"
        onClick={() => switchTheme("editorial")}
        title="Editorial Paper Style"
        aria-label="Editorial Paper Style"
        className={`min-h-[38px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
          theme === "editorial"
            ? "bg-[var(--yellow)] text-[var(--ink)] shadow-sm"
            : "text-[var(--ink)] hover:bg-[#FFF8E6]"
        }`}
      >
        <IconPalette className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Paper</span>
      </button>

      <button
        type="button"
        onClick={() => switchTheme("dark")}
        title="Dark Slate Pro Style"
        aria-label="Dark Slate Pro Style"
        className={`min-h-[38px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
          theme === "dark"
            ? "bg-slate-900 text-teal-400 border border-slate-700 shadow-sm"
            : "text-[var(--ink)] hover:bg-slate-100"
        }`}
      >
        <IconMoon className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Dark</span>
      </button>
    </div>
  );
}
