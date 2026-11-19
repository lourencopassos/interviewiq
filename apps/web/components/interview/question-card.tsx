"use client";

import { Mic, CornerDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { interpolate, useI18n } from "@/lib/i18n";
import { label } from "@/lib/labels";
import { categoryTone } from "@/lib/score";

interface QuestionCardProps {
  text: string;
  category: string;
  order: number;
  total: number;
  /** Marks an adaptive follow-up inserted after a weak answer. */
  isFollowUp?: boolean;
}

/** The interviewer's row: peach avatar tile, eyebrow, and the question itself. */
export function QuestionCard({
  text,
  category,
  order,
  total,
  isFollowUp = false,
}: QuestionCardProps) {
  const { t } = useI18n();
  const categoryLabel = label(t, "category", category);

  return (
    <article className="tile animate-pop-in p-5 sm:p-6">
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-1.5 border-ink bg-peach text-peach-deep shadow-pop-sm">
          <Mic className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="eyebrow tabular-nums">
              {interpolate(t.interview.question.eyebrow, { order, total })}
            </span>
            {isFollowUp && (
              <span className="pill animate-pop-in bg-lavender text-lavender-deep">
                <CornerDownRight className="h-3 w-3" /> {t.interview.question.followUp}
              </span>
            )}
            <Badge variant={categoryTone[category] ?? "outline"} className="ml-auto">
              {categoryLabel}
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
