"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Play, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreTone, toneStyles } from "@/components/report/score-tone";

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
  /** Resolves on success; rejects (or throws) with an Error on failure. */
  onDelete: (id: string) => Promise<void>;
}

const difficultyTone: Record<string, string> = {
  JUNIOR: "bg-sky text-sky-deep",
  MID: "bg-sage text-sage-deep",
  SENIOR: "bg-butter text-butter-deep",
  STAFF: "bg-lavender text-lavender-deep",
};

const statusLabel: Record<string, string> = {
  SETUP: "setting up",
  RESEARCHING: "researching",
  BRIEFING: "briefing",
  INTERVIEWING: "in progress",
  WRAPPING_UP: "wrapping up",
  ABANDONED: "abandoned",
};

const RESUMABLE_STATUSES = new Set(["INTERVIEWING", "WRAPPING_UP"]);
const CONFIRM_TIMEOUT_MS = 4000;

export function SessionCard({ session, onDelete }: SessionCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Auto-reset the confirm state after a few seconds of inactivity
  useEffect(() => {
    if (!confirming) return;
    const timeout = setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [confirming]);

  const date = new Date(session.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const canResume = RESUMABLE_STATUSES.has(session.status);
  const unfinished = session.status !== "COMPLETED";

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(session.id);
      // On success the parent removes this card; nothing else to do.
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete session",
      );
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
              {session.difficulty.toLowerCase()}
            </span>
            <span className="pill bg-card">
              {session.interviewType.replace(/_/g, " ").toLowerCase()}
            </span>
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
            <span className="eyebrow mt-1 text-[9px] text-current opacity-80">/100</span>
          </div>
        ) : unfinished ? (
          <span
            className={cn(
              "pill shrink-0",
              session.status === "ABANDONED" ? "bg-blush text-blush-deep" : "bg-butter text-butter-deep",
            )}
          >
            {canResume && <span className="led led-live bg-current" aria-hidden />}
            {statusLabel[session.status] ?? session.status.replace(/_/g, " ").toLowerCase()}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <span className="mr-auto text-[11px] tabular-nums text-muted-foreground">{date}</span>

        {canResume && (
          <Button asChild size="sm" variant="accent">
            <Link href={`/interview/${session.id}`}>
              <Play className="h-3 w-3" />
              Resume
            </Link>
          </Button>
        )}
        {session.report && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/report/${session.id}`}>
              <Eye className="h-3 w-3" />
              Report
            </Link>
          </Button>
        )}
        <Button asChild size="sm" variant="ghost">
          <Link href="/new">
            <RotateCcw className="h-3 w-3" />
            Retake
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
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground hover:bg-blush hover:text-blush-deep"
            aria-label="Delete session"
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
          {deleteError}
        </p>
      )}
    </article>
  );
}
