"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Play, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCALE_TAGS, useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { label } from "@/lib/labels";
import { describeError, toUiError, type UiError } from "@/lib/errors";
import { scoreTone, toneStyles } from "@/lib/score";

interface SessionCardProps {
  session: {
    id: string;
    createdAt: string;
    jobTitle: string;
    companyName: string;
    difficulty: string;
    interviewType: string;
    status: string;
    report: { overallScore: number } | null;
  };
  /** Resolves on success; rejects with the failure (rendered with describeError). */
  onDelete: (id: string) => Promise<void>;
}

const difficultyTone: Record<string, string> = {
  JUNIOR: "bg-sky text-sky-deep",
  MID: "bg-sage text-sage-deep",
  SENIOR: "bg-butter text-butter-deep",
  STAFF: "bg-lavender text-lavender-deep",
};

const RESUMABLE_STATUSES = new Set(["INTERVIEWING", "WRAPPING_UP"]);
const CONFIRM_TIMEOUT_MS = 4000;

export function SessionCard({ session, onDelete }: SessionCardProps) {
  const { t, locale } = useI18n();
  const copy = t.history.card;
  const localeTag = LOCALE_TAGS[locale];
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<UiError | null>(null);

  // Auto-reset the confirm state after a few seconds of inactivity
  useEffect(() => {
    if (!confirming) return;
    const timeout = setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [confirming]);

  const date = formatDate(locale, session.createdAt);

  // Pills read lowercase by design; the shared labels are sentence case.
  const difficultyLabel = label(t, "difficulty", session.difficulty).toLocaleLowerCase(localeTag);
  const typeLabel = label(t, "interviewType", session.interviewType).toLocaleLowerCase(localeTag);
  const statusLabel = label(t, "status", session.status).toLocaleLowerCase(localeTag);

  const canResume = RESUMABLE_STATUSES.has(session.status);
  const unfinished = session.status !== "COMPLETED";

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(session.id);
      // On success the parent removes this card; nothing else to do.
    } catch (err) {
      setDeleteError(toUiError(err));
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="tile-pop tile-pop-hover flex h-full flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow truncate">{session.companyName}</p>
          <h3 className="mt-0.5 truncate text-base">{session.jobTitle}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={cn("pill", difficultyTone[session.difficulty] ?? "bg-card")}>
              {difficultyLabel}
            </span>
            <span className="pill bg-card">{typeLabel}</span>
          </div>
        </div>

        {session.report ? (
          <div
            className={cn(
              "flex shrink-0 flex-col items-center rounded-md border-1.5 border-ink px-3 py-2 shadow-pop-sm",
              toneStyles[scoreTone(session.report.overallScore)].tile,
            )}
          >
            <span className="text-2xl font-extrabold leading-none tabular-nums">
              {session.report.overallScore}
            </span>
            <span className="eyebrow mt-1 text-[9px] text-current opacity-80">{copy.outOf}</span>
          </div>
        ) : unfinished ? (
          <span
            className={cn(
              "pill shrink-0",
              session.status === "ABANDONED" ? "bg-blush text-blush-deep" : "bg-butter text-butter-deep",
            )}
          >
            {canResume && <span className="led led-live bg-current" aria-hidden />}
            {statusLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <span className="mr-auto text-[11px] tabular-nums text-muted-foreground">{date}</span>

        {canResume && (
          <Button asChild size="sm" variant="accent">
            <Link href={`/interview/${session.id}`}>
              <Play className="h-3 w-3" />
              {copy.resume}
            </Link>
          </Button>
        )}
        {session.report && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/report/${session.id}`}>
              <Eye className="h-3 w-3" />
              {copy.report}
            </Link>
          </Button>
        )}
        <Button asChild size="sm" variant="ghost">
          <Link href="/new">
            <RotateCcw className="h-3 w-3" />
            {copy.retake}
          </Link>
        </Button>
        {confirming ? (
          <>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : copy.confirm}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              {t.common.cancel}
            </Button>
          </>
        ) : (
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground hover:bg-blush hover:text-blush-deep"
            aria-label={copy.deleteLabel}
            onClick={() => {
              setDeleteError(null);
              setConfirming(true);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {deleteError && (
        <p role="alert" className="text-[11px] text-rust">
          {describeError(t, deleteError)}
        </p>
      )}
    </article>
  );
}
