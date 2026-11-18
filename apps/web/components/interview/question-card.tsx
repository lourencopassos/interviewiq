"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface QuestionCardProps {
  text: string;
  category: string;
  order: number;
  total: number;
}

const categoryLabels: Record<string, string> = {
  technical: "Technical",
  behavioral: "Behavioral",
  system_design: "System Design",
  culture_fit: "Culture Fit",
};

const categoryColors: Record<string, string> = {
  technical: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  behavioral: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  system_design: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  culture_fit: "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

export function QuestionCard({ text, category, order, total }: QuestionCardProps) {
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500 border-border/50 bg-card/50">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <Badge
            variant="outline"
            className={categoryColors[category] || ""}
          >
            {categoryLabels[category] || category}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Question {order} of {total}
          </span>
        </div>
        <p className="text-lg text-foreground leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  );
}
