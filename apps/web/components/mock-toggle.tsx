"use client";

import { useState, useEffect } from "react";
import { getMockMode, toggleMockMode } from "@/lib/mock-mode";

export function MockToggle() {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEnabled(getMockMode());
    setMounted(true);
  }, []);

  // Only render in development
  if (process.env.NODE_ENV !== "development") return null;
  if (!mounted) return null;

  return (
    <button
      onClick={() => {
        const next = toggleMockMode();
        setEnabled(next);
      }}
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg transition-colors ${
        enabled
          ? "bg-amber-500/90 text-black hover:bg-amber-400"
          : "bg-zinc-700/90 text-zinc-300 hover:bg-zinc-600"
      }`}
      title={enabled ? "Mock mode ON — click to use real APIs" : "Live mode — click to enable mock mode"}
    >
      <span className="text-sm">🧪</span>
      <span>{enabled ? "MOCK" : "LIVE"}</span>
      <span
        className={`ml-1 inline-block h-2 w-2 rounded-full ${
          enabled ? "bg-black/40" : "bg-green-400"
        }`}
      />
    </button>
  );
}
