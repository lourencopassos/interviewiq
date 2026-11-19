"use client";

import { Layers } from "lucide-react";
import type { InterviewStage } from "@interviewiq/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { scoreTone, toneStyles } from "@/lib/score";

interface StageTransitionCardProps {
  /** Null for the opening stage intro (nothing finished yet). */
  completedStage: InterviewStage | null;
  stageScore: number;
  nextStage: InterviewStage;
}

/** Full Loop mode: a lavender tile announcing the finished stage and the next one. */
export function StageTransitionCard({
  completedStage,
  stageScore,
  nextStage,
}: StageTransitionCardProps) {
  const { t } = useI18n();

  return (
    <section className="tile animate-pop-in bg-lavender p-5 sm:p-6" aria-live="polite">
      {completedStage && (
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-lavender-deep">{t.interview.stageTransition.complete}</p>
            <p className="mt-1 truncate text-[17px] font-extrabold tracking-tight text-lavender-deep">
              {t.interview.stages[completedStage]}
            </p>
          </div>
          <div
            className={cn(
              "flex shrink-0 items-baseline gap-1 rounded-md border-1.5 border-ink px-3 py-1.5 shadow-pop-sm",
              toneStyles[scoreTone(stageScore)].tile,
            )}
          >
            <span className="text-3xl font-extrabold leading-none tabular-nums">{stageScore}</span>
            <span className="text-[11px] font-semibold opacity-70">/100</span>
          </div>
        </div>
      )}

      <div className="my-4 flex items-center gap-3">
        <span className="h-0 flex-1 border-t-1.5 border-dashed border-line-strong" aria-hidden />
        <span className="eyebrow text-lavender-deep">{t.interview.stageTransition.upNext}</span>
        <span className="h-0 flex-1 border-t-1.5 border-dashed border-line-strong" aria-hidden />
      </div>

      <div className="flex items-center justify-center gap-2 text-[15px] font-extrabold tracking-tight text-lavender-deep">
        <Layers className="h-4 w-4" />
        {t.interview.stages[nextStage]}
      </div>
    </section>
  );
}
