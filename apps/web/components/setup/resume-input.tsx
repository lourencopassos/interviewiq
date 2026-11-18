"use client";

import { FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useSetupStore } from "@/lib/stores/setup-store";

export function ResumeInput() {
  const { resumeText, setResumeText, step } = useSetupStore();
  const disabled = step !== "input" && step !== "error";
  const charCount = resumeText.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="resume-text" className="eyebrow inline-flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Your resume
          <span className="pill border-line-strong bg-card text-[10px] normal-case tracking-normal text-muted-foreground">
            optional
          </span>
        </label>
        {charCount > 0 && (
          <span className="pill bg-sky text-sky-deep tabular-nums">
            {charCount.toLocaleString()} chars
          </span>
        )}
      </div>
      <Textarea
        id="resume-text"
        placeholder="Paste your resume or CV as text. Questions then lean on what you've actually done."
        value={resumeText}
        onChange={(e) => setResumeText(e.target.value)}
        disabled={disabled}
        aria-describedby="resume-text-hint"
        className="min-h-[120px] resize-y"
      />
      <p id="resume-text-hint" className="text-[11px] text-muted-foreground">
        Skip it and the interviewer works from the posting alone.
      </p>
    </div>
  );
}
