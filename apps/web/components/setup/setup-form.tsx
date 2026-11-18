"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSetupStore } from "@/lib/stores/setup-store";
import { JobDescriptionInput } from "./job-description-input";
import { ResumeInput } from "./resume-input";
import { InterviewConfig } from "./interview-config";
import { AnalysisProgress } from "./analysis-progress";
import { JobPreviewCard } from "./job-preview-card";
import { StartInterviewButton } from "./start-interview-button";
import { VideoModeToggle } from "./video-mode-toggle";

export function SetupForm() {
  const { step, error, jobDescription, analyzeJob, reset } = useSetupStore();
  const canAnalyze =
    jobDescription.length >= 50 && (step === "input" || step === "error");
  const isAnalyzing = step === "parsing" || step === "researching";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Set Up Your Interview
        </h1>
        <p className="text-muted-foreground">
          Paste a job description and we&apos;ll create a tailored mock
          interview with real company intelligence.
        </p>
      </div>

      <JobDescriptionInput />
      <ResumeInput />
      <InterviewConfig />
      <VideoModeToggle disabled={isAnalyzing} />

      {/* Error state */}
      {step === "error" && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analyze button */}
      {(step === "input" || step === "error") && (
        <Button
          size="lg"
          onClick={analyzeJob}
          disabled={!canAnalyze}
          className="w-full"
        >
          Analyze Job
        </Button>
      )}

      {/* Progress indicator */}
      {isAnalyzing && <AnalysisProgress />}

      {/* Results */}
      {step === "ready" && (
        <div className="space-y-4">
          <AnalysisProgress />
          <JobPreviewCard />
          <StartInterviewButton />
          <Button
            variant="ghost"
            onClick={reset}
            className="w-full text-muted-foreground"
          >
            Start over with a different job
          </Button>
        </div>
      )}
    </div>
  );
}
