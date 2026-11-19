"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { CoachingReport, CoachNoteView } from "@interviewiq/types";
import { interpolate, LOCALE_TAGS, useI18n, type Dictionary } from "@/lib/i18n";
import { ApiError, apiRequest } from "@/lib/api-client";
import { describeError, toUiError, type UiError } from "@/lib/errors";
import { label } from "@/lib/labels";
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
    /** Whether the in-interview coach was available. Older payloads omit it (treated as on). */
    coachEnabled?: boolean;
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
    coachNotes?: CoachNoteView[];
    coachedBeforeAnswer?: boolean;
  }[];
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40;

/** What went wrong: an API/network failure, or polling ran out of attempts. */
type ReportError = UiError | "timeout";

function describeReportError(t: Dictionary, error: ReportError): string {
  if (error === "timeout") return t.report.fetchErrors.timeout;
  if (error instanceof ApiError && error.code === "REPORT_FAILED") return t.report.fetchErrors.failed;
  return describeError(t, error);
}

/** The session belongs to another browser, or does not exist: both read as "not found". */
const isNotFound = (error: unknown) =>
  error instanceof ApiError && (error.code === "SESSION_NOT_FOUND" || error.code === "FORBIDDEN");

type ViewState =
  | { kind: "loading"; attempt: number; sessionStatus: string | null }
  | { kind: "ready"; data: ReportData }
  | { kind: "not_found" }
  | { kind: "error"; error: ReportError };

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const localeTag = LOCALE_TAGS[locale];
  const [view, setView] = useState<ViewState>({
    kind: "loading",
    attempt: 0,
    sessionStatus: null,
  });
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<UiError | null>(null);
  // Bumped to restart polling, e.g. when a regenerate request comes back 202.
  const [pollRun, setPollRun] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let pollTimeout: ReturnType<typeof setTimeout> | null = null;

    async function fetchReport() {
      if (cancelled) return;
      attempt += 1;

      let res: Response;
      try {
        res = await apiRequest(`/api/sessions/${id}/report`);
      } catch (error) {
        if (cancelled) return;
        setView(isNotFound(error) ? { kind: "not_found" } : { kind: "error", error: toUiError(error) });
        return;
      }

      // 202 `{ status }`: the report is still being generated.
      if (res.status === 202) {
        const body = (await res.json().catch(() => ({}))) as { status?: string };
        if (cancelled) return;
        if (attempt >= MAX_POLL_ATTEMPTS) {
          setView({ kind: "error", error: "timeout" });
          return;
        }
        setView({ kind: "loading", attempt, sessionStatus: body.status ?? null });
        pollTimeout = setTimeout(fetchReport, POLL_INTERVAL_MS);
        return;
      }

      const data = (await res.json()) as ReportData;
      if (!cancelled) setView({ kind: "ready", data });
    }

    setView({ kind: "loading", attempt: 0, sessionStatus: null });
    fetchReport();

    return () => {
      cancelled = true;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [id, pollRun]);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    setRegenerateError(null);
    try {
      const res = await apiRequest(`/api/sessions/${id}/report`, { method: "POST" });
      if (res.status === 202) {
        setPollRun((n) => n + 1);
        return;
      }
      setView({ kind: "ready", data: (await res.json()) as ReportData });
    } catch (err) {
      setRegenerateError(toUiError(err));
    } finally {
      setRegenerating(false);
    }
  }, [id]);

  if (view.kind === "loading") {
    const statusCopy =
      view.sessionStatus === "WRAPPING_UP"
        ? t.report.loading.wrappingUp
        : view.sessionStatus === "INTERVIEWING"
          ? t.report.loading.interviewing
          : t.report.loading.waiting;

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
              {interpolate(t.report.loading.check, { n: view.attempt, total: MAX_POLL_ATTEMPTS })}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (view.kind === "not_found") {
    const copy = t.report.notFound;
    return (
      <div className="container max-w-lg py-24">
        <div className="tile-pop bg-butter p-6 text-butter-deep sm:p-8">
          <p className="eyebrow text-current opacity-80">{copy.eyebrow}</p>
          <h1 className="mt-2 text-2xl text-current">{copy.title}</h1>
          <p className="mt-2 text-[13px] leading-relaxed opacity-90">{copy.body}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/history">{copy.backToHistory}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/new">{copy.startNew}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view.kind === "error") {
    const copy = t.report.errorState;
    return (
      <div className="container max-w-lg py-24">
        <div className="tile-pop bg-blush p-6 text-blush-deep sm:p-8">
          <p className="eyebrow text-current opacity-80">{copy.eyebrow}</p>
          <h1 className="mt-2 text-2xl text-current">{describeReportError(t, view.error)}</h1>
          <p className="mt-2 text-[13px] leading-relaxed opacity-90">{copy.body}</p>

          {regenerateError && (
            <Alert variant="destructive" className="mt-4 bg-card">
              <AlertTitle>{copy.regenerateFailedTitle}</AlertTitle>
              <AlertDescription>{describeError(t, regenerateError)}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {regenerating ? copy.regenerating : copy.regenerate}
            </Button>
            <Button asChild variant="outline">
              <Link href="/history">{copy.backToHistory}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { report, session, questions } = view.data;

  // The title strip reads lowercase by design; the shared labels are sentence case.
  const difficultyLabel = label(t, "difficulty", session.difficulty).toLocaleLowerCase(localeTag);
  const typeLabel = label(t, "interviewType", session.interviewType).toLocaleLowerCase(localeTag);
  const languageLabel = label(t, "interviewLanguage", session.language);

  return (
    <div className="container max-w-4xl space-y-8 py-10">
      {/* Title strip */}
      <header className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">
            <span className="text-ink">[ {t.report.eyebrow} ]</span> {session.companyName} ·{" "}
            {difficultyLabel} · {typeLabel}
          </p>
          <h1 className="mt-2 text-balance text-2xl sm:text-3xl">{session.jobTitle}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {session.coachEnabled === false && (
            <span className="pill bg-transparent text-muted-foreground">{t.report.coach.coachOff}</span>
          )}
          <span className="pill bg-card">{languageLabel}</span>
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
        <section aria-label={t.report.summary.sectionLabel} className="tile p-5">
          <p className="eyebrow">
            <span className="text-ink">[ {t.report.summary.eyebrow} ]</span>{" "}
            {t.report.summary.tagline}
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{report.executiveSummary}</p>
        </section>

        {report.companyCultureFit && (
          <section
            aria-label={t.report.cultureFit.sectionLabel}
            className="tile bg-sky p-5 text-sky-deep"
          >
            <p className="eyebrow text-current opacity-80">
              [ {t.report.cultureFit.eyebrow} ]{" "}
              {interpolate(t.report.cultureFit.at, { company: session.companyName })}
            </p>
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
          <span className="eyebrow">{t.report.retake.eyebrow}</span>
          <span className="pill bg-card tabular-nums text-ink">
            {interpolate(t.report.retake.days, { n: report.estimatedRetakeReadiness })}
          </span>
          {t.report.retake.tail}
        </p>
      )}

      {/* Actions */}
      <ReportActions />
    </div>
  );
}
