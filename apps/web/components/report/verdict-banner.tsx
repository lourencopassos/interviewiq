"use client";

import { cn } from "@/lib/utils";
import type { CoachingReport } from "@interviewiq/types";

interface VerdictBannerProps {
  verdict: CoachingReport["verdict"];
  overallScore: number;
}

const verdictStyles: Record<
  CoachingReport["verdict"],
  { tile: string; note: string }
> = {
  "Strong Pass": {
    tile: "bg-sage text-sage-deep",
    note: "You'd likely move forward. Keep the edge sharp.",
  },
  "Lean Pass": {
    tile: "bg-sage text-sage-deep",
    note: "Probably a yes, with a few reservations on the table.",
  },
  Borderline: {
    tile: "bg-butter text-butter-deep",
    note: "Could go either way. The gaps below decide it.",
  },
  "No Pass": {
    tile: "bg-blush text-blush-deep",
    note: "Not this time. The study plan is the shortest route back.",
  },
};

export function VerdictBanner({ verdict, overallScore }: VerdictBannerProps) {
  const style = verdictStyles[verdict];

  return (
    <section
      aria-label="Overall result"
      className={cn(
        "tile-pop flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6",
        style.tile,
      )}
    >
      <div className="min-w-0">
        <p className="eyebrow text-current opacity-80">overall result</p>
        <h2 className="mt-1 text-3xl text-current sm:text-4xl">{verdict}</h2>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed opacity-90">{style.note}</p>
      </div>

      <div className="flex shrink-0 items-end gap-1 rounded-md border-1.5 border-ink bg-card px-5 py-3 text-ink shadow-pop-sm">
        <span className="text-5xl font-extrabold leading-none tabular-nums tracking-tight animate-pop-in">
          {overallScore}
        </span>
        <span className="pb-1 text-[13px] font-semibold tabular-nums text-muted-foreground">
          /100
        </span>
      </div>
    </section>
  );
}
