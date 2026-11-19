"use client";

import Link from "next/link";
import { AlertCircle, MicOff, RefreshCw } from "lucide-react";
import type { ErrorCode } from "@interviewiq/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { describeError, describeErrorCode, type UiError } from "@/lib/errors";
import { useI18n, type Dictionary } from "@/lib/i18n";
import type { InterviewMachineState } from "@/lib/interview/phase-machine";

interface InterviewAlertsProps {
  /** Last server `error` event. */
  serverError: { code: ErrorCode; retryable: boolean } | null;
  errors: InterviewMachineState["errors"];
  starting: boolean;
  micDenied: boolean;
  onRetryLastAction: () => void;
  onDismissServerError: () => void;
  onRetryStart: () => void;
  onRetryUpload: () => void;
  onDismissSubmitError: () => void;
  onRetryRecording: () => void;
}

/** A session from another browser and a deleted one look the same to the candidate. */
function describeStartError(t: Dictionary, error: UiError): string {
  if (
    error instanceof ApiError &&
    (error.code === "SESSION_NOT_FOUND" || error.code === "FORBIDDEN")
  ) {
    return t.interview.alerts.start.notFound;
  }
  return describeError(t, error);
}

/** Every alert the interview page can show, in priority order. Rendered in the loading view too. */
export function InterviewAlerts({
  serverError,
  errors,
  starting,
  micDenied,
  onRetryLastAction,
  onDismissServerError,
  onRetryStart,
  onRetryUpload,
  onDismissSubmitError,
  onRetryRecording,
}: InterviewAlertsProps) {
  const { t } = useI18n();
  const copy = t.interview.alerts;

  return (
    <>
      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{copy.server.title}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{describeErrorCode(t, serverError.code)}</p>
            <div className="flex flex-wrap gap-2">
              {serverError.retryable ? (
                <Button size="sm" variant="outline" onClick={onRetryLastAction} className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  {t.common.retry}
                </Button>
              ) : (
                <Link href="/new">
                  <Button size="sm" variant="outline">
                    {copy.server.newInterview}
                  </Button>
                </Link>
              )}
              <Button size="sm" variant="ghost" onClick={onDismissServerError}>
                {t.common.dismiss}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {errors.stop && (
        <p className="tile bg-blush p-3 text-sm" role="alert">
          {describeError(t, errors.stop)}
        </p>
      )}

      {errors.start && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{copy.start.title}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="whitespace-pre-wrap break-words">{describeStartError(t, errors.start)}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onRetryStart}
                disabled={starting}
                className="gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                {starting ? copy.start.retrying : t.common.retry}
              </Button>
              <Link href="/new">
                <Button size="sm" variant="ghost">
                  {copy.start.back}
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {errors.submit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{copy.submit.title}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{describeError(t, errors.submit)}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={onRetryUpload} className="gap-1">
                <RefreshCw className="h-3 w-3" />
                {copy.submit.retryUpload}
              </Button>
              <Button size="sm" variant="ghost" onClick={onDismissSubmitError}>
                {copy.submit.recordAgain}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {micDenied && (
        <Alert variant="warning">
          <MicOff className="h-4 w-4" />
          <AlertTitle>{copy.mic.title}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{copy.mic.body}</p>
            <Button size="sm" variant="outline" onClick={onRetryRecording} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              {t.common.retry}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {errors.record && !micDenied && (
        <Alert variant="destructive">
          <MicOff className="h-4 w-4" />
          <AlertTitle>{copy.recording.title}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{describeError(t, errors.record)}</p>
            <Button size="sm" variant="outline" onClick={onRetryRecording} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              {t.common.retry}
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
