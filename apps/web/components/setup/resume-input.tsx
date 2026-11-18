"use client";

import { FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useSetupStore } from "@/lib/stores/setup-store";
import { useI18n, interpolate, LOCALE_TAGS } from "@/lib/i18n";

export function ResumeInput() {
  const { t, locale } = useI18n();
  const { resumeText, setResumeText, step } = useSetupStore();
  const disabled = step !== "input" && step !== "error";
  const charCount = resumeText.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="resume-text" className="eyebrow inline-flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {t.setup.resume.label}
          <span className="pill border-line-strong bg-card text-[10px] normal-case tracking-normal text-muted-foreground">
            {t.common.optional}
          </span>
        </label>
        {charCount > 0 && (
          <span className="pill bg-sky text-sky-deep tabular-nums">
            {interpolate(t.setup.charCount, {
              count: charCount.toLocaleString(LOCALE_TAGS[locale]),
            })}
          </span>
        )}
      </div>
      <Textarea
        id="resume-text"
        placeholder={t.setup.resume.placeholder}
        value={resumeText}
        onChange={(e) => setResumeText(e.target.value)}
        disabled={disabled}
        aria-describedby="resume-text-hint"
        className="min-h-[120px] resize-y"
      />
      <p id="resume-text-hint" className="text-[11px] text-muted-foreground">
        {t.setup.resume.hint}
      </p>
    </div>
  );
}
