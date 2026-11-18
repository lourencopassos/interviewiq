"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StageTransitionCardProps {
  completedStage: string;
  stageScore: number;
  nextStage: string;
}

function getScoreColor(score: number): string {
  if (score >= 75) return "text-green-400";
  if (score >= 55) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 75) return "default";
  if (score >= 55) return "secondary";
  return "destructive";
}

export function StageTransitionCard({
  completedStage,
  stageScore,
  nextStage,
}: StageTransitionCardProps) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {completedStage && (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Stage Completed</p>
                <p className="font-medium text-foreground">{completedStage}</p>
              </div>
              <Badge variant={getScoreBadgeVariant(stageScore)}>
                <span className={getScoreColor(stageScore)}>
                  {stageScore}/100
                </span>
              </Badge>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Up Next
            </span>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{nextStage}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
