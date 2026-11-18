"use client";

import { cn } from "@interviewiq/ui/lib/utils";
import type { CoachingReport } from "@interviewiq/types";

interface VerdictBannerProps {
  verdict: CoachingReport["verdict"];
  overallScore: number;
}

const verdictStyles: Record<CoachingReport["verdict"], string> = {
  "Strong Pass": "from-green-600/20 to-green-900/20 border-green-500/30 text-green-400",
  "Lean Pass": "from-yellow-600/20 to-yellow-900/20 border-yellow-500/30 text-yellow-400",
  "Borderline": "from-orange-600/20 to-orange-900/20 border-orange-500/30 text-orange-400",
  "No Pass": "from-red-600/20 to-red-900/20 border-red-500/30 text-red-400",
};

export function VerdictBanner({ verdict, overallScore }: VerdictBannerProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-gradient-to-r p-6 text-center",
        verdictStyles[verdict],
      )}
    >
      <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Overall Result
      </p>
      <h2 className="mt-1 text-3xl font-bold">{verdict}</h2>
      <p className="mt-1 text-lg font-semibold">{overallScore}/100</p>
    </div>
  );
}
