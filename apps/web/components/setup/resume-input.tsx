"use client";

import { FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSetupStore } from "@/lib/stores/setup-store";

export function ResumeInput() {
  const { resumeText, setResumeText, step } = useSetupStore();
  const disabled = step !== "input" && step !== "error";
  const charCount = resumeText.length;

  return (
    <div className="space-y-2">
      <Label htmlFor="resume-text" className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Paste your resume / CV
        <span className="text-xs font-normal text-muted-foreground">
          (optional — makes the interview more personalized)
        </span>
      </Label>
      <Textarea
        id="resume-text"
        placeholder="Paste your resume or CV text here for questions tailored to your experience..."
        value={resumeText}
        onChange={(e) => setResumeText(e.target.value)}
        disabled={disabled}
        className="min-h-[120px] resize-y"
      />
      {charCount > 0 && (
        <div className="flex justify-end text-xs text-muted-foreground">
          <span>{charCount.toLocaleString()} characters</span>
        </div>
      )}
    </div>
  );
}
