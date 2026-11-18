"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Clock, ExternalLink } from "lucide-react";
import { cn } from "@interviewiq/ui/lib/utils";
import type { StudyPlanItem } from "@interviewiq/types";

interface StudyPlanSectionProps {
  studyPlan: StudyPlanItem[];
}

const resourceTypeColors: Record<string, string> = {
  book: "bg-blue-500/20 text-blue-400",
  course: "bg-purple-500/20 text-purple-400",
  practice: "bg-green-500/20 text-green-400",
  article: "bg-yellow-500/20 text-yellow-400",
};

function StudyPlanCard({ item, index }: { item: StudyPlanItem; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
            {index + 1}
          </span>
          <span className="font-medium">{item.topic}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {item.estimatedHours}h
          </Badge>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      <div
        className={cn(
          "grid transition-all duration-200",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="border-t pt-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Why it matters</p>
              <p className="text-sm">{item.whyItMatters}</p>
            </div>

            {item.resources.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Resources</p>
                <div className="space-y-2">
                  {item.resources.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Badge className={resourceTypeColors[r.type]}>{r.type}</Badge>
                      {r.url ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          {r.title}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm">{r.title}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground">Practice prompt</p>
              <p className="text-sm italic">&ldquo;{item.practicePrompt}&rdquo;</p>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

export function StudyPlanSection({ studyPlan }: StudyPlanSectionProps) {
  if (studyPlan.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Study Plan</h3>
      {studyPlan.map((item, i) => (
        <StudyPlanCard key={i} item={item} index={i} />
      ))}
    </div>
  );
}
