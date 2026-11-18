"use client";

import { useState, useEffect } from "react";
import { getMockMode, toggleMockMode } from "@/lib/mock-mode";
import { useI18n } from "@/lib/i18n";

/** Dev-only switch for the canned-fixture interview loop. Lives bottom-left. */
export function MockToggle() {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    setEnabled(getMockMode());
    setMounted(true);
  }, []);

  if (process.env.NODE_ENV !== "development") return null;
  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={() => setEnabled(toggleMockMode())}
      className={`tile-pop tile-pop-hover tile-pop-press fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] shadow-pop-sm print:hidden ${
        enabled ? "bg-butter text-butter-deep" : "bg-card text-ink-2"
      }`}
      title={enabled ? t.common.mock.titleOn : t.common.mock.titleOff}
    >
      <span className={`led ${enabled ? "led-live bg-rust text-rust/40" : "bg-line-strong text-line-strong/40"}`} aria-hidden />
      {enabled ? t.common.mock.on : t.common.mock.off}
    </button>
  );
}
