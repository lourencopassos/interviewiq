"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { scoreTone, toneStyles } from "./score-tone";

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: "sm" | "lg";
}

/**
 * A ring that draws itself in once mounted: the stroke starts at zero and
 * transitions to the score. The number inside is tabular so it never shifts.
 */
export function ScoreGauge({ score, label, size = "sm" }: ScoreGaugeProps) {
  const dims = size === "lg" ? { w: 140, r: 58, sw: 8 } : { w: 100, r: 40, sw: 6 };
  const circumference = 2 * Math.PI * dims.r;
  const progress = (score / 100) * circumference;
  const tone = toneStyles[scoreTone(score)];

  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: dims.w, height: dims.w }}>
        <svg
          width={dims.w}
          height={dims.w}
          viewBox={`0 0 ${dims.w} ${dims.w}`}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={dims.w / 2}
            cy={dims.w / 2}
            r={dims.r}
            fill="none"
            strokeWidth={dims.sw}
            className="stroke-line"
          />
          <circle
            cx={dims.w / 2}
            cy={dims.w / 2}
            r={dims.r}
            fill="none"
            strokeWidth={dims.sw}
            strokeDasharray={circumference}
            strokeDashoffset={drawn ? circumference - progress : circumference}
            strokeLinecap="round"
            className={cn(
              "transition-[stroke-dashoffset] duration-1000 ease-pop",
              tone.stroke,
            )}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "font-extrabold tabular-nums tracking-tight",
              tone.text,
              size === "lg" ? "text-4xl" : "text-xl",
            )}
          >
            {score}
          </span>
        </div>
      </div>
      <span className="eyebrow">{label}</span>
    </div>
  );
}
