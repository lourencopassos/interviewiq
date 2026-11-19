"use client";

import { CornerDownRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface TransitionCardProps {
  message: string;
}

/** The interviewer's remark between questions: a lavender system tile. */
export function TransitionCard({ message }: TransitionCardProps) {
  const { t } = useI18n();

  return (
    <div className="tile animate-pop-in bg-lavender p-4 sm:p-5">
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-1.5 border-ink bg-card text-lavender-deep shadow-pop-sm">
          <CornerDownRight className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="eyebrow text-lavender-deep">{t.interview.transition.interviewer}</span>
          </div>
          <p className="text-[14px] font-medium leading-relaxed text-lavender-deep">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
