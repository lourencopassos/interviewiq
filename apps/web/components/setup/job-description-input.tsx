"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSetupStore } from "@/lib/stores/setup-store";

export function JobDescriptionInput() {
  const { jobDescription, setJobDescription, step } = useSetupStore();
  const disabled = step !== "input" && step !== "error";
  const charCount = jobDescription.length;
  const minChars = 50;

  return (
    <div className="space-y-2">
      <Label htmlFor="job-description">Paste the job description</Label>
      <Textarea
        id="job-description"
        placeholder="Paste the full job description here..."
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        disabled={disabled}
        className="min-h-[200px] resize-y"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {charCount < minChars
            ? `${minChars - charCount} more characters needed`
            : "Ready to analyze"}
        </span>
        <span>{charCount.toLocaleString()} characters</span>
      </div>
    </div>
  );
}
