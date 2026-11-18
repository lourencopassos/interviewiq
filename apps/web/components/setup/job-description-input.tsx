"use client";

import { Textarea } from "@/components/ui/textarea";
import { useSetupStore } from "@/lib/stores/setup-store";
import { cn } from "@/lib/utils";

export function JobDescriptionInput() {
  const { jobDescription, setJobDescription, step } = useSetupStore();
  const disabled = step !== "input" && step !== "error";
  const charCount = jobDescription.length;
  const minChars = 50;
  const ready = charCount >= minChars;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label id="job-description-label" htmlFor="job-description" className="eyebrow">
          <span className="text-ink">[ 01 ]</span> paste the posting
        </label>
        <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:inline-flex">
          <span className="kbd">⌘</span>
          <span className="kbd">V</span>
        </span>
      </div>

      <Textarea
        id="job-description"
        placeholder="Paste the full job description, requirements and all. The more of it, the sharper the questions."
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
            ? "Enough to analyze"
            : `${minChars - charCount} more characters to go`}
        </span>
        <span
          className={cn(
            "pill tabular-nums",
            ready ? "bg-sage text-sage-deep" : "bg-card text-ink-2",
          )}
        >
          {charCount.toLocaleString()} chars
        </span>
      </div>
    </div>
  );
}
