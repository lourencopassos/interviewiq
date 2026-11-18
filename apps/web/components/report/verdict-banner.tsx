"use client";

import { cn } from "@/lib/utils";
import type { CoachingReport } from "@interviewiq/types";
import { useI18n } from "@/lib/i18n";

interface VerdictBannerProps {
  verdict: CoachingReport["verdict"];
  overallScore: number;
}

const verdictTile: Record<CoachingReport["verdict"], string> = {
  "Strong Pass": "bg-sage text-sage-deep",
  "Lean Pass": "bg-sage text-sage-deep",
  Borderline: "bg-butter text-butter-deep",
  "No Pass": "bg-blush text-blush-deep",
};

export function VerdictBanner({ verdict, overallScore }: VerdictBannerProps) {
  const { t } = useI18n();
  const copy = t.report.verdict;

  return (
    <section
      aria-label={copy.sectionLabel}
      className={cn(
        "tile-pop flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6",
        verdictTile[verdict],
      )}
    >
      <div className="min-w-0">
        <p className="eyebrow text-current opacity-80">{copy.eyebrow}</p>
        <h2 className="mt-1 text-3xl text-current sm:text-4xl">{copy.names[verdict] ?? verdict}</h2>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed opacity-90">{copy.notes[verdict]}</p>
      </div>

      <div className="flex shrink-0 items-end gap-1 rounded-md border-1.5 border-ink bg-card px-5 py-3 text-ink shadow-pop-sm">
        <span className="text-5xl font-extrabold leading-none tabular-nums tracking-tight animate-pop-in">
          {overallScore}
        </span>
        <span className="pb-1 text-[13px] font-semibold tabular-nums text-muted-foreground">
          {copy.outOf}
        </span>
      </div>
    </section>
  );
}
