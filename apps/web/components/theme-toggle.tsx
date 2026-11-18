"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const STORAGE_KEY = "interviewiq-theme";

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

/** Light paper by default; the choice persists per browser. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // storage unavailable — theme still applies for this page
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? t.common.theme.toLight : t.common.theme.toDark}
      title={dark ? t.common.theme.toLight : t.common.theme.toDark}
      className={`tile-pop tile-pop-hover tile-pop-press inline-flex h-9 w-9 items-center justify-center rounded-md shadow-pop-sm ${className}`}
    >
      {mounted && dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/** Inline script that applies the stored theme before first paint (no flash). */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`;
