"use client";

import { Lightbulb } from "lucide-react";

interface NextTipsPanelProps {
  tips: string[];
}

export function NextTipsPanel({ tips }: NextTipsPanelProps) {
  if (tips.length === 0) return null;

  return (
    <section aria-label="Tips for your next interview" className="tile-pop bg-butter p-5 text-butter-deep">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow text-current opacity-80">
          <span className="text-current opacity-100">[ next time ]</span> walk in with these
        </p>
        <Lightbulb className="h-4 w-4 shrink-0" />
      </div>
      <ul className="mt-4 space-y-2.5">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-3 text-[13px] leading-relaxed">
            <span
              aria-hidden
              className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border-1.5 border-current bg-card/60"
            />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
