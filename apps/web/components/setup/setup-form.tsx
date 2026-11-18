"use client";

import { AlertCircle, ArrowRight } from "lucide-react";
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

/**
 * Two columns on desktop. Left: the posting (hero input) and the analysis log.
 * Right: what was parsed, then the session configuration and the start button.
 * On mobile the right column simply follows the left.
 */
export function SetupForm() {
  const { step, error, jobDescription, analyzeJob, reset } = useSetupStore();
  const canAnalyze =
    jobDescription.length >= 50 && (step === "input" || step === "error");
  const isAnalyzing = step === "parsing" || step === "researching";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
      {/* ------------------------------------------------------------ */}
      {/* [ 01 ] the posting                                             */}
      {/* ------------------------------------------------------------ */}
      <div className="space-y-4 lg:sticky lg:top-20">
        <section className="tile p-5" aria-labelledby="job-description-label">
          <JobDescriptionInput />

          {(step === "input" || step === "error") && (
            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[11px] leading-relaxed text-muted-foreground">
                Parsing and company research take about 40 seconds.
              </span>
              <Button
                variant="accent"
                size="lg"
                onClick={analyzeJob}
                disabled={!canAnalyze}
                className="w-full sm:w-auto"
              >
                Analyze the posting <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </section>

        {/* Error state */}
        {step === "error" && error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analysis failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress log: while analyzing and once ready */}
        {(isAnalyzing || step === "ready") && <AnalysisProgress />}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* parsed preview + [ 02 ] configure                              */}
      {/* ------------------------------------------------------------ */}
      <div className="space-y-4">
        {step === "ready" && <JobPreviewCard />}

        <section className="tile p-5" aria-labelledby="configure-label">
          <p id="configure-label" className="eyebrow">
            <span className="text-ink">[ 02 ]</span> configure
          </p>
          <h2 className="mt-1 text-lg">How the session runs.</h2>

          <div className="mt-5 space-y-6">
            <InterviewConfig />
            <VideoModeToggle disabled={isAnalyzing} />
            <ResumeInput />
          </div>
        </section>

        {step === "ready" && (
          <div className="space-y-3">
            <StartInterviewButton />
            <Button
              variant="ghost"
              onClick={reset}
              className="w-full text-muted-foreground"
            >
              Start over with a different posting
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
