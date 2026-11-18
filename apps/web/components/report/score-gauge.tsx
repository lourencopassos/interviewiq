"use client";

import { cn } from "@interviewiq/ui/lib/utils";

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: "sm" | "lg";
}

function getScoreColor(score: number): string {
  if (score >= 75) return "text-green-400";
  if (score >= 55) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function getStrokeColor(score: number): string {
  if (score >= 75) return "stroke-green-400";
  if (score >= 55) return "stroke-yellow-400";
  if (score >= 40) return "stroke-orange-400";
  return "stroke-red-400";
}

export function ScoreGauge({ score, label, size = "sm" }: ScoreGaugeProps) {
  const dims = size === "lg" ? { w: 140, r: 58, sw: 8 } : { w: 100, r: 40, sw: 6 };
  const circumference = 2 * Math.PI * dims.r;
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={dims.w}
        height={dims.w}
        viewBox={`0 0 ${dims.w} ${dims.w}`}
        className="transform -rotate-90"
      >
        <circle
          cx={dims.w / 2}
          cy={dims.w / 2}
          r={dims.r}
          fill="none"
          strokeWidth={dims.sw}
          className="stroke-muted"
        />
        <circle
          cx={dims.w / 2}
          cy={dims.w / 2}
          r={dims.r}
          fill="none"
          strokeWidth={dims.sw}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className={cn("transition-all duration-1000", getStrokeColor(score))}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: dims.w, height: dims.w }}>
        <span className={cn("font-bold", getScoreColor(score), size === "lg" ? "text-3xl" : "text-xl")}>
          {score}
        </span>
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
