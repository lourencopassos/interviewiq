"use client";

import { Badge } from "@/components/ui/badge";

interface TransitionCardProps {
  message: string;
  score?: number;
  tier?: string;
}

const tierColors: Record<string, string> = {
  poor: "bg-red-500/20 text-red-400 border-red-500/30",
  good: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  excellent: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export function TransitionCard({ message, score, tier }: TransitionCardProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-lg border border-border/50 bg-card/50 p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-foreground/80 italic leading-relaxed">
          {message}
        </p>
        {score !== undefined && tier && (
          <Badge
            variant="outline"
            className={`shrink-0 ${tierColors[tier] || ""}`}
          >
            {score}
          </Badge>
        )}
      </div>
    </div>
  );
}
