"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    /** Not part of the payload today; rendered in the title strip when present. */
    createdAt?: string;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
    const statusCopy =
      view.sessionStatus === "WRAPPING_UP"
        ? "Writing your coaching report. This takes about a minute."
        : view.sessionStatus === "INTERVIEWING"
          ? "The interview is still running. The report appears once it ends."
          : "Waiting for the report.";

    return (
      <div className="container max-w-4xl space-y-6 py-10" aria-busy="true">
        <div className="space-y-2">
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-8 w-80 max-w-full" />
        </div>
        <Skeleton className="h-28 w-full rounded-tile" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-tile" />
          ))}
        </div>
        <Skeleton className="h-28 w-full rounded-tile" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-44 rounded-tile" />
          <Skeleton className="h-44 rounded-tile" />
        </div>

        {view.attempt > 0 && (
          <div
            role="status"
            className="tile flex items-center gap-3 bg-lavender p-4 text-lavender-deep"
          >
            <span className="led led-live bg-current" aria-hidden />
            <p className="text-[13px]">{statusCopy}</p>
            <span className="ml-auto hidden text-[11px] tabular-nums opacity-70 sm:inline">
              check {view.attempt}/{MAX_POLL_ATTEMPTS}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (view.kind === "not_found") {
    return (
      <div className="container max-w-lg py-24">
        <div className="tile-pop bg-butter p-6 text-butter-deep sm:p-8">
          <p className="eyebrow text-current opacity-80">[ 404 ] session not found</p>
          <h1 className="mt-2 text-2xl text-current">There&apos;s no report here.</h1>
          <p className="mt-2 text-[13px] leading-relaxed opacity-90">
            This session doesn&apos;t exist or was deleted.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/history">Back to history</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/new">Start a new interview</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view.kind === "error") {
    return (
      <div className="container max-w-lg py-24">
        <div className="tile-pop bg-blush p-6 text-blush-deep sm:p-8">
          <p className="eyebrow text-current opacity-80">[ report ] couldn&apos;t load</p>
          <h1 className="mt-2 text-2xl text-current">{view.message}</h1>
          <p className="mt-2 text-[13px] leading-relaxed opacity-90">
            Regenerating rebuilds the report from the recorded answers.
          </p>

          {regenerateError && (
            <Alert variant="destructive" className="mt-4 bg-card">
              <AlertTitle>Regenerate failed</AlertTitle>
              <AlertDescription>{regenerateError}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {regenerating ? "Regenerating…" : "Regenerate report"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/history">Back to history</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { report, session, questions } = view.data;

  return (
    <div className="container max-w-4xl space-y-8 py-10">
      {/* Title strip */}
      <header className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">
            <span className="text-ink">[ report ]</span> {session.companyName} ·{" "}
            {session.difficulty.toLowerCase()} · {session.interviewType.replace(/_/g, " ").toLowerCase()}
          </p>
          <h1 className="mt-2 text-balance text-2xl sm:text-3xl">{session.jobTitle}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {session.createdAt ? (
            <span className="pill bg-card tabular-nums">{formatDate(session.createdAt)}</span>
          ) : (
            <span className="pill bg-card">{session.language.replace(/_/g, "-")}</span>
          )}
        </div>
      </header>

      {/* Verdict */}
      <VerdictBanner verdict={report.verdict} overallScore={report.overallScore} />

      {/* Dimension scores */}
      <DimensionScores
        overallScore={report.overallScore}
        dimensions={report.dimensionScores}
      />

      {/* Summary + culture fit */}
      <div className={report.companyCultureFit ? "grid gap-4 md:grid-cols-[1.4fr_1fr]" : ""}>
        <section aria-label="Summary" className="tile p-5">
          <p className="eyebrow">
            <span className="text-ink">[ summary ]</span> the short version
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{report.executiveSummary}</p>
        </section>

        {report.companyCultureFit && (
          <section aria-label="Culture fit" className="tile bg-sky p-5 text-sky-deep">
            <p className="eyebrow text-current opacity-80">[ culture fit ] at {session.companyName}</p>
            <p className="mt-2 text-[13px] leading-relaxed">{report.companyCultureFit}</p>
          </section>
        )}
      </div>

      {/* Strengths and areas to improve */}
      <StrengthsImprovements
        strengths={report.strengths}
        areasToImprove={report.areasToImprove}
      />

      {/* Study plan */}
      <StudyPlanSection studyPlan={report.studyPlan} />

      {/* Question review */}
      <QuestionReview questions={questions} />

      {/* Next interview tips */}
      <NextTipsPanel tips={report.nextInterviewTips} />

      {/* Retake readiness */}
      {report.estimatedRetakeReadiness > 0 && (
        <p className="flex flex-wrap items-center justify-center gap-2 text-[12px] text-muted-foreground">
          <span className="eyebrow">retake readiness</span>
          <span className="pill bg-card tabular-nums text-ink">
            {report.estimatedRetakeReadiness} days
          </span>
          of focused study before the next attempt
        </p>
      )}

      {/* Actions */}
      <ReportActions sessionId={session.id} />
    </div>
  );
}
