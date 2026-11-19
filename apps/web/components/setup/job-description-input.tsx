"use client";

import { Textarea } from "@/components/ui/textarea";
import { useSetupStore } from "@/lib/stores/setup-store";
import { useI18n, interpolate, LOCALE_TAGS } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { JOB_DESCRIPTION_MIN_LENGTH } from "@interviewiq/types";

export function JobDescriptionInput() {
  const { t, locale } = useI18n();
  const { jobDescription, setJobDescription, step } = useSetupStore();
  const disabled = step !== "input" && step !== "error";
  const charCount = jobDescription.length;
  const minChars = JOB_DESCRIPTION_MIN_LENGTH;
  const ready = charCount >= minChars;
  const remaining = minChars - charCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label id="job-description-label" htmlFor="job-description" className="eyebrow">
          <span className="text-ink">[ 01 ]</span> {t.setup.posting.label}
        </label>
        <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:inline-flex">
          <span className="kbd">⌘</span>
          <span className="kbd">V</span>
        </span>
      </div>

      <Textarea
        id="job-description"
        placeholder={t.setup.posting.placeholder}
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        disabled={disabled}
        aria-describedby="job-description-hint"
        className="min-h-[280px] resize-y text-[13.5px] lg:min-h-[340px]"
      />

      <div
        id="job-description-hint"
        className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground"
      >
        <span className="inline-flex items-center gap-2">
          <span
            className={cn(
              "led",
              ready ? "bg-sage-deep text-sage-deep/40" : "bg-line-strong text-line-strong/40",
            )}
            aria-hidden
          />
          {ready
            ? t.setup.posting.enough
            : remaining === 1
              ? t.setup.posting.moreCharsOne
              : interpolate(t.setup.posting.moreCharsOther, { count: remaining })}
        </span>
        <span
          className={cn(
            "pill tabular-nums",
            ready ? "bg-sage text-sage-deep" : "bg-card text-ink-2",
          )}
        >
          {interpolate(t.setup.charCount, {
            count: charCount.toLocaleString(LOCALE_TAGS[locale]),
          })}
        </span>
      </div>
    </div>
  );
}
