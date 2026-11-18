"use client";

import { cn } from "@/lib/utils";
import type { CoachingReport } from "@interviewiq/types";

interface StrengthsImprovementsProps {
  strengths: CoachingReport["strengths"];
  areasToImprove: CoachingReport["areasToImprove"];
}

const priorityTone: Record<CoachingReport["areasToImprove"][number]["priority"], string> = {
  high: "bg-blush text-blush-deep",
  medium: "bg-butter text-butter-deep",
  low: "bg-sage text-sage-deep",
};

export function StrengthsImprovements({
  strengths,
  areasToImprove,
}: StrengthsImprovementsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-label="Strengths">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">
            <span className="text-ink">[ strengths ]</span> what landed
          </p>
          <span className="pill bg-sage text-sage-deep tabular-nums">{strengths.length}</span>
        </div>
        <div className="space-y-2">
          {strengths.map((s, i) => (
            <div key={i} className="sheet p-4">
              <p className="font-semibold text-ink">{s.title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{s.detail}</p>
            </div>
          ))}
          {strengths.length === 0 && (
            <div className="sheet border-dashed border-line-strong p-4 text-[12.5px] text-muted-foreground">
              Nothing stood out as a strength this time.
            </div>
          )}
        </div>
      </section>

      <section aria-label="Areas to improve">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">
            <span className="text-ink">[ areas to improve ]</span> fix these first
          </p>
          <span className="pill bg-butter text-butter-deep tabular-nums">{areasToImprove.length}</span>
        </div>
        <div className="space-y-2">
          {areasToImprove.map((a, i) => (
            <div key={i} className="sheet p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-ink">{a.title}</p>
                <span className={cn("pill shrink-0", priorityTone[a.priority])}>{a.priority}</span>
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{a.detail}</p>
            </div>
          ))}
          {areasToImprove.length === 0 && (
            <div className="sheet border-dashed border-line-strong p-4 text-[12.5px] text-muted-foreground">
              No gaps worth a line. Keep doing what you did.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
