"use client";

import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface StageTransitionCardProps {
  completedStage: string;
  stageScore: number;
  nextStage: string;
}

function scoreTone(score: number): string {
  if (score >= 75) return "bg-sage text-sage-deep";
  if (score >= 55) return "bg-butter text-butter-deep";
  return "bg-blush text-blush-deep";
}

/** Full Loop mode: a lavender tile announcing the finished stage and the next one. */
export function StageTransitionCard({
  completedStage,
  stageScore,
  nextStage,
}: StageTransitionCardProps) {
  return (
    <section className="tile animate-pop-in bg-lavender p-5 sm:p-6" aria-live="polite">
      {completedStage && (
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-lavender-deep">Stage complete</p>
            <p className="mt-1 truncate text-[17px] font-extrabold tracking-tight text-lavender-deep">
              {completedStage}
            </p>
          </div>
          <div
            className={cn(
              "flex shrink-0 items-baseline gap-1 rounded-md border-1.5 border-ink px-3 py-1.5 shadow-pop-sm",
              scoreTone(stageScore),
            )}
          >
            <span className="text-3xl font-extrabold leading-none tabular-nums">{stageScore}</span>
            <span className="text-[11px] font-semibold opacity-70">/100</span>
          </div>
        </div>
      )}

      <div className="my-4 flex items-center gap-3">
        <span className="h-0 flex-1 border-t-1.5 border-dashed border-line-strong" aria-hidden />
        <span className="eyebrow text-lavender-deep">Up next</span>
        <span className="h-0 flex-1 border-t-1.5 border-dashed border-line-strong" aria-hidden />
      </div>

      <div className="flex items-center justify-center gap-2 text-[15px] font-extrabold tracking-tight text-lavender-deep">
        <Layers className="h-4 w-4" />
        {nextStage}
      </div>
    </section>
  );
}
