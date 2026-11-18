"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Play, RotateCcw, Trash2, Loader2 } from "lucide-react";

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

const difficultyColors: Record<string, string> = {
  JUNIOR: "bg-blue-500/20 text-blue-400",
  MID: "bg-green-500/20 text-green-400",
  SENIOR: "bg-orange-500/20 text-orange-400",
  STAFF: "bg-purple-500/20 text-purple-400",
};

const RESUMABLE_STATUSES = new Set(["INTERVIEWING", "WRAPPING_UP"]);
const CONFIRM_TIMEOUT_MS = 4000;

function scoreColor(score: number): string {
  if (score >= 75) return "bg-green-500/20 text-green-400";
  if (score >= 55) return "bg-yellow-500/20 text-yellow-400";
  if (score >= 40) return "bg-orange-500/20 text-orange-400";
  return "bg-red-500/20 text-red-400";
}

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
    <Card>
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold truncate">{session.jobTitle}</h3>
          <p className="text-sm text-muted-foreground">{session.companyName}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className={difficultyColors[session.difficulty]}>
            {session.difficulty}
          </Badge>
          <Badge variant="outline">
            {session.interviewType.replace(/_/g, " ")}
          </Badge>
          {session.report && (
            <Badge className={scoreColor(session.report.overallScore)}>
              {session.report.overallScore}/100
            </Badge>
          )}
          {session.status !== "COMPLETED" && (
            <Badge variant="outline" className="text-yellow-400">
              {session.status.replace(/_/g, " ")}
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground">{date}</p>

        <div className="flex flex-wrap gap-2">
          {canResume && (
            <Link href={`/interview/${session.id}`}>
              <Button size="sm" className="gap-1">
                <Play className="h-3 w-3" />
                Resume
              </Button>
            </Link>
          )}
          {session.report && (
            <Link href={`/report/${session.id}`}>
              <Button size="sm" variant="outline" className="gap-1">
                <Eye className="h-3 w-3" />
                Report
              </Button>
            </Link>
          )}
          <Link href="/new">
            <Button size="sm" variant="outline" className="gap-1">
              <RotateCcw className="h-3 w-3" />
              Retake
            </Button>
          </Link>
          {confirming ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Confirm"
                )}
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
              size="sm"
              variant="ghost"
              className="gap-1 text-muted-foreground"
              aria-label="Delete session"
              onClick={() => {
                setDeleteError(null);
                setConfirming(true);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {deleteError && (
          <p role="alert" className="text-xs text-destructive">
            {deleteError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
