"use client";

import { cn } from "@/lib/utils";
import type { CoachingReport } from "@interviewiq/types";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  const strengthsCopy = t.report.strengths;
  const improveCopy = t.report.improvements;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-label={strengthsCopy.sectionLabel}>
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">
            <span className="text-ink">[ {strengthsCopy.eyebrow} ]</span> {strengthsCopy.tagline}
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
              {strengthsCopy.empty}
            </div>
          )}
        </div>
      </section>

      <section aria-label={improveCopy.sectionLabel}>
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">
            <span className="text-ink">[ {improveCopy.eyebrow} ]</span> {improveCopy.tagline}
          </p>
          <span className="pill bg-butter text-butter-deep tabular-nums">{areasToImprove.length}</span>
        </div>
        <div className="space-y-2">
          {areasToImprove.map((a, i) => (
            <div key={i} className="sheet p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-ink">{a.title}</p>
                <span className={cn("pill shrink-0", priorityTone[a.priority])}>
                  {improveCopy.priority[a.priority] ?? a.priority}
                </span>
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{a.detail}</p>
            </div>
          ))}
          {areasToImprove.length === 0 && (
            <div className="sheet border-dashed border-line-strong p-4 text-[12.5px] text-muted-foreground">
              {improveCopy.empty}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
