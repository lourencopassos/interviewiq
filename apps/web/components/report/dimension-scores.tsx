"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { CoachingReport } from "@interviewiq/types";
import { useI18n } from "@/lib/i18n";
import { scoreTone, toneStyles } from "@/lib/score";

interface DimensionScoresProps {
  overallScore: number;
  dimensions: CoachingReport["dimensionScores"];
}

const DIMENSION_KEYS: (keyof CoachingReport["dimensionScores"])[] = [
  "technical",
  "problemSolving",
  "communication",
  "behavioral",
];

/**
 * Four tiles, one per dimension. The bar fills in from zero after mount; a
 * thin ink tick marks the overall score so you can see which dimensions pull
 * above or below it.
 */
export function DimensionScores({ overallScore, dimensions }: DimensionScoresProps) {
  const { t } = useI18n();
  const copy = t.report.dimensions;
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section aria-label={copy.sectionLabel}>
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">
          <span className="text-ink">[ {copy.eyebrow} ]</span> {copy.tagline}
        </p>
        <p className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
          <span aria-hidden className="inline-block h-3 w-0.5 bg-ink" />
          {copy.overall} <span className="tabular-nums text-ink">{overallScore}</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DIMENSION_KEYS.map((key, i) => {
          const score = dimensions[key];
          const tone = toneStyles[scoreTone(score)];
          return (
            <div
              key={key}
              className="tile p-4 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="eyebrow">{copy.names[key]}</span>
                <span className={cn("text-2xl font-extrabold tabular-nums", tone.text)}>
                  {score}
                </span>
              </div>
              <div className="relative mt-3 h-2.5 overflow-hidden rounded-full border border-ink bg-paper-2">
                <div
                  className="h-full rounded-full border-r border-ink transition-[width] duration-1000 ease-pop"
                  style={{
                    width: drawn ? `${score}%` : "0%",
                    backgroundColor: tone.fillVar,
                  }}
                />
                <span
                  aria-hidden
                  className="absolute top-0 h-full w-0.5 bg-ink"
                  style={{ left: `calc(${overallScore}% - 1px)` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
