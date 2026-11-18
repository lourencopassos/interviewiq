"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CoachingReport } from "@interviewiq/types";
import { VerdictBanner } from "@/components/report/verdict-banner";
import { DimensionScores } from "@/components/report/dimension-scores";
import { StrengthsImprovements } from "@/components/report/strengths-improvements";
import { StudyPlanSection } from "@/components/report/study-plan-section";
import { QuestionReview } from "@/components/report/question-review";
import { NextTipsPanel } from "@/components/report/next-tips-panel";
import { ReportActions } from "@/components/report/report-actions";

interface ReportData {
  report: CoachingReport;
  session: {
    id: string;
    companyName: string;
    jobTitle: string;
    difficulty: string;
    interviewType: string;
    language: string;
    status: string;
  };
  questions: {
    id: string;
    order: number;
    text: string;
    category: string;
    transcript: string | null;
    score: number | null;
    feedback: string | null;
    strengths: string[];
    gaps: string[];
  }[];
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40;

type ViewState =
  | { kind: "loading"; attempt: number; sessionStatus: string | null }
  | { kind: "ready"; data: ReportData }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<ViewState>({
    kind: "loading",
    attempt: 0,
    sessionStatus: null,
  });
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;

    async function fetchReport() {
      if (cancelled) return;
      attempt += 1;

      let res: Response;
      try {
        res = await fetch(`/api/sessions/${id}/report`);
      } catch {
        if (!cancelled) {
          setView({
            kind: "error",
            message: "Network error — could not load the report",
          });
        }
        return;
      }
      if (cancelled) return;

      if (res.status === 200) {
        const json = (await res.json()) as ReportData;
        if (!cancelled) setView({ kind: "ready", data: json });
        return;
      }

      if (res.status === 404) {
        setView({ kind: "not_found" });
        return;
      }

      if (res.status === 202) {
        const body = (await res.json().catch(() => ({}))) as {
          status?: string;
        };
        if (cancelled) return;
        if (attempt >= MAX_POLL_ATTEMPTS) {
          setView({
            kind: "error",
            message:
              "The report is taking longer than expected. You can try generating it again.",
          });
          return;
        }
        setView({
          kind: "loading",
          attempt,
          sessionStatus: body.status ?? null,
        });
        pollTimeoutRef.current = setTimeout(fetchReport, POLL_INTERVAL_MS);
        return;
      }

      const body = (await res.json().catch(() => ({}))) as {
        code?: string;
        error?: string;
      };
      if (cancelled) return;
      setView({
        kind: "error",
        message:
          body.code === "FAILED"
            ? "Report generation failed."
            : typeof body.error === "string"
              ? body.error
              : `Failed to load report (${res.status})`,
      });
    }

    setView({ kind: "loading", attempt: 0, sessionStatus: null });
    fetchReport();

    return () => {
      cancelled = true;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [id]);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    setRegenerateError(null);
    try {
      const res = await fetch(`/api/sessions/${id}/report`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string"
            ? json.error
            : `Regeneration failed (${res.status})`,
        );
      }
      setView({ kind: "ready", data: json as ReportData });
    } catch (err) {
      setRegenerateError(
        err instanceof TypeError
          ? "Network error — please try again"
          : err instanceof Error
            ? err.message
            : "Regeneration failed",
      );
    } finally {
      setRegenerating(false);
    }
  }, [id]);

  if (view.kind === "loading") {
    return (
      <div className="container py-8 max-w-4xl space-y-6">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="flex justify-center gap-8">
          <Skeleton className="h-36 w-36 rounded-full" />
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-24 w-24 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        {view.attempt > 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {view.sessionStatus === "WRAPPING_UP"
              ? "Generating your coaching report..."
              : view.sessionStatus === "INTERVIEWING"
                ? "Your interview is still in progress. The report will appear once it finishes."
                : "Waiting for your report..."}
          </p>
        )}
      </div>
    );
  }

  if (view.kind === "not_found") {
    return (
      <div className="container py-8 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-lg font-medium">Session not found</p>
            <p className="text-sm text-muted-foreground">
              This interview session does not exist or was deleted.
            </p>
            <Link href="/history">
              <Button variant="outline">Back to history</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view.kind === "error") {
    return (
      <div className="container py-8 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-destructive">{view.message}</p>
            {regenerateError && (
              <p role="alert" className="text-sm text-destructive">
                {regenerateError}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="gap-2"
              >
                {regenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {regenerating ? "Regenerating..." : "Regenerate report"}
              </Button>
              <Link href="/history">
                <Button variant="outline">Back to history</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { report, session, questions } = view.data;

  return (
    <div className="container py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:block">
        <div>
          <h1 className="text-2xl font-bold">{session.jobTitle}</h1>
          <p className="text-muted-foreground">
            {session.companyName}
            <span className="mx-2">·</span>
            <Badge variant="outline">{session.difficulty}</Badge>
            <span className="mx-2">·</span>
            <Badge variant="outline">{session.interviewType.replace("_", " ")}</Badge>
          </p>
        </div>
      </div>

      {/* Verdict Banner */}
      <VerdictBanner verdict={report.verdict} overallScore={report.overallScore} />

      {/* Dimension Scores */}
      <DimensionScores
        overallScore={report.overallScore}
        dimensions={report.dimensionScores}
      />

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{report.executiveSummary}</p>
        </CardContent>
      </Card>

      {/* Culture Fit */}
      {report.companyCultureFit && (
        <Card>
          <CardHeader>
            <CardTitle>Culture Fit Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{report.companyCultureFit}</p>
          </CardContent>
        </Card>
      )}

      {/* Strengths & Improvements */}
      <StrengthsImprovements
        strengths={report.strengths}
        areasToImprove={report.areasToImprove}
      />

      {/* Study Plan */}
      <StudyPlanSection studyPlan={report.studyPlan} />

      {/* Question Review */}
      <QuestionReview questions={questions} />

      {/* Next Interview Tips */}
      <NextTipsPanel tips={report.nextInterviewTips} />

      {/* Retake Readiness */}
      {report.estimatedRetakeReadiness > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Estimated readiness for retake: {report.estimatedRetakeReadiness} days of focused study
        </p>
      )}

      {/* Actions */}
      <ReportActions sessionId={session.id} />
    </div>
  );
}
