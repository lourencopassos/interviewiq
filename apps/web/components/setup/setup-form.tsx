"use client";

import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSetupStore } from "@/lib/stores/setup-store";
import { describeError } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { JobDescriptionInput } from "./job-description-input";
import { SavedSetup } from "./saved-setup";
import { InterviewConfig } from "./interview-config";
import { AnalysisProgress } from "./analysis-progress";
import { JobPreviewCard } from "./job-preview-card";
import { StartInterviewButton } from "./start-interview-button";
import { VideoModeToggle } from "./video-mode-toggle";
import { CoachToggle } from "./coach-toggle";
import { JOB_DESCRIPTION_MIN_LENGTH } from "@interviewiq/types";

/**
 * Two columns on desktop. Left: the posting (hero input) and the analysis log.
 * Right: what was parsed, then the session configuration and the start button.
 * On mobile the right column simply follows the left.
 */
export function SetupForm() {
  const { t } = useI18n();
  const { step, restored, error, jobDescription, analyzeJob, reset } = useSetupStore();
  const canAnalyze =
    jobDescription.length >= JOB_DESCRIPTION_MIN_LENGTH && (step === "input" || step === "error");
  const isAnalyzing = step === "parsing" || step === "researching";

  const errorMessage = error ? describeError(t, error) : null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
      <SavedSetup />
      {/* ------------------------------------------------------------ */}
      {/* [ 01 ] the posting                                             */}
      {/* ------------------------------------------------------------ */}
      <div className="space-y-4 lg:sticky lg:top-20">
        <section className="tile p-5" aria-labelledby="job-description-label">
          <JobDescriptionInput />

          {(step === "input" || step === "error") && (
            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[11px] leading-relaxed text-muted-foreground">
                {t.setup.posting.timing}
              </span>
              <Button
                variant="accent"
                size="lg"
                onClick={analyzeJob}
                disabled={!canAnalyze}
                className="w-full sm:w-auto"
              >
                {t.setup.posting.analyze} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </section>

        {/* Error state */}
        {step === "error" && errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t.setup.analysis.failedTitle}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Progress log: while analyzing and once ready */}
        {(isAnalyzing || (step === "ready" && !restored)) && <AnalysisProgress />}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* parsed preview + [ 02 ] configure                              */}
      {/* ------------------------------------------------------------ */}
      <div className="space-y-4">
        {step === "ready" && <JobPreviewCard />}

        <section className="tile p-5" aria-labelledby="configure-label">
          <p id="configure-label" className="eyebrow">
            <span className="text-ink">[ 02 ]</span> {t.setup.configure.eyebrow}
          </p>
          <h2 className="mt-1 text-lg">{t.setup.configure.title}</h2>

          <div className="mt-5 space-y-6">
            <InterviewConfig disabled={isAnalyzing} />
            <VideoModeToggle disabled={isAnalyzing} />
            <CoachToggle disabled={isAnalyzing} />
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
              {t.setup.startOver}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
