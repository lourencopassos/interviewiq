"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** Shown for a moment after the last answer, before the redirect to the report. */
export function InterviewComplete() {
  const { t } = useI18n();

  return (
    <div className="container max-w-3xl py-12 sm:py-20">
      <div className="tile flex flex-col items-center gap-4 bg-sage px-6 py-12 text-center text-sage-deep animate-pop-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-1.5 border-ink bg-card text-sage-deep shadow-pop">
          <Check className="h-8 w-8" strokeWidth={3} aria-hidden />
        </div>
        <p className="eyebrow text-sage-deep">{t.interview.complete.eyebrow}</p>
        <h2 className="text-2xl text-sage-deep sm:text-3xl">{t.interview.complete.title}</h2>
        <p className="flex items-center gap-2 text-[13px] font-semibold">
          <span className="led led-live bg-sage-deep text-sage-deep/40" aria-hidden />
          {t.interview.complete.building}
        </p>
      </div>
    </div>
  );
}
