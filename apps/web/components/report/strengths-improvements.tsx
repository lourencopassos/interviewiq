"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CoachingReport } from "@interviewiq/types";

interface StrengthsImprovementsProps {
  strengths: CoachingReport["strengths"];
  areasToImprove: CoachingReport["areasToImprove"];
}

const priorityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-orange-500/20 text-orange-400",
  low: "bg-yellow-500/20 text-yellow-400",
};

export function StrengthsImprovements({
  strengths,
  areasToImprove,
}: StrengthsImprovementsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-green-400">Strengths</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {strengths.map((s, i) => (
            <div key={i}>
              <p className="font-medium">{s.title}</p>
              <p className="text-sm text-muted-foreground">{s.detail}</p>
            </div>
          ))}
          {strengths.length === 0 && (
            <p className="text-sm text-muted-foreground">No strengths identified.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-orange-400">Areas to Improve</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {areasToImprove.map((a, i) => (
            <div key={i}>
              <div className="flex items-center gap-2">
                <p className="font-medium">{a.title}</p>
                <Badge className={priorityColors[a.priority]}>{a.priority}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{a.detail}</p>
            </div>
          ))}
          {areasToImprove.length === 0 && (
            <p className="text-sm text-muted-foreground">No areas to improve identified.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
