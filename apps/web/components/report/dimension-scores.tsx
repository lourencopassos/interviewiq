"use client";

import { ScoreGauge } from "./score-gauge";
import type { CoachingReport } from "@interviewiq/types";

interface DimensionScoresProps {
  overallScore: number;
  dimensions: CoachingReport["dimensionScores"];
}

export function DimensionScores({ overallScore, dimensions }: DimensionScoresProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-8 py-6">
      <div className="relative">
        <ScoreGauge score={overallScore} label="Overall" size="lg" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="relative">
          <ScoreGauge score={dimensions.technical} label="Technical" />
        </div>
        <div className="relative">
          <ScoreGauge score={dimensions.problemSolving} label="Problem Solving" />
        </div>
        <div className="relative">
          <ScoreGauge score={dimensions.communication} label="Communication" />
        </div>
        <div className="relative">
          <ScoreGauge score={dimensions.behavioral} label="Behavioral" />
        </div>
      </div>
    </div>
  );
}
