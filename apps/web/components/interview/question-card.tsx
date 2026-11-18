"use client";

import { Mic, CornerDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuestionCardProps {
  text: string;
  category: string;
  order: number;
  total: number;
  /** Marks an adaptive follow-up inserted after a weak answer. */
  isFollowUp?: boolean;
}

const categoryLabels: Record<string, string> = {
  technical: "Technical",
  behavioral: "Behavioral",
  system_design: "System Design",
  culture_fit: "Culture Fit",
};

const categoryTone: Record<string, "sky" | "sage" | "butter" | "lavender"> = {
  technical: "sky",
  behavioral: "sage",
  system_design: "butter",
  culture_fit: "lavender",
};

/** The interviewer's row: peach avatar tile, eyebrow, and the question itself. */
export function QuestionCard({
  text,
  category,
  order,
  total,
  isFollowUp = false,
}: QuestionCardProps) {
  return (
    <article className="tile animate-pop-in p-5 sm:p-6">
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-1.5 border-ink bg-peach text-peach-deep shadow-pop-sm">
          <Mic className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="eyebrow">
              Interviewer · question <span className="tabular-nums">{order}</span> of{" "}
              <span className="tabular-nums">{total}</span>
            </span>
            {isFollowUp && (
              <span className="pill animate-pop-in bg-lavender text-lavender-deep">
                <CornerDownRight className="h-3 w-3" /> follow-up
              </span>
            )}
            <Badge variant={categoryTone[category] ?? "outline"} className="ml-auto">
              {categoryLabels[category] || category}
            </Badge>
          </div>
          <p className="text-[16px] font-medium leading-relaxed text-ink sm:text-[17px]">
            {text}
          </p>
        </div>
      </div>
    </article>
  );
}
