"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { clientHeaders } from "@/lib/client-id";
import { interpolate, useI18n } from "@/lib/i18n";
import { SessionCard } from "@/components/history/session-card";
import { SessionFilters } from "@/components/history/session-filters";
import { EmptyState } from "@/components/history/empty-state";
import { DeleteAllData } from "@/components/history/delete-all-data";

interface SessionItem {
  id: string;
  createdAt: string;
  jobTitle: string;
  companyName: string;
  difficulty: string;
  interviewType: string;
  status: string;
  report: { overallScore: number } | null;
}

export default function HistoryPage() {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState("all");
  const [interviewType, setInterviewType] = useState("all");

  const fetchSessions = useCallback(async () => {
    try {
      // Lists every status, drafts (SETUP) and abandoned sessions included.
      const res = await fetch("/api/sessions", { headers: clientHeaders() });
      if (res.ok) {
        setSessions(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const deleteErrors = t.history.deleteErrors;
  const handleDelete = useCallback(
    async (id: string) => {
      let res: Response;
      try {
        res = await fetch(`/api/sessions/${id}`, { method: "DELETE", headers: clientHeaders() });
      } catch (error) {
        console.error("Failed to delete session:", error);
        throw new Error(deleteErrors.network);
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          res.status === 403
            ? deleteErrors.forbidden
            : res.status === 404
              ? deleteErrors.gone
              : typeof data?.error === "string"
                ? data.error
                : interpolate(deleteErrors.status, { status: res.status });
        if (res.status === 404) {
          // Already gone — drop it from the list rather than erroring
          setSessions((prev) => prev.filter((s) => s.id !== id));
          return;
        }
        throw new Error(message);
      }

      setSessions((prev) => prev.filter((s) => s.id !== id));
    },
    [deleteErrors],
  );

  const clearFilters = useCallback(() => {
    setDifficulty("all");
    setInterviewType("all");
  }, []);

  const filtered = sessions.filter((s) => {
    if (difficulty !== "all" && s.difficulty !== difficulty) return false;
    if (interviewType !== "all" && s.interviewType !== interviewType) return false;
    return true;
  });

  const hasActiveFilters = difficulty !== "all" || interviewType !== "all";

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <span>
              <span className="text-ink">[ {t.history.eyebrow} ]</span> {t.history.tagline}
            </span>
            {!loading && (
              <span className="pill bg-card tabular-nums normal-case tracking-normal">
                {hasActiveFilters
                  ? interpolate(t.history.countFiltered, { n: filtered.length, total: sessions.length })
                  : interpolate(t.history.count, { n: sessions.length })}
              </span>
            )}
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl">{t.history.title}</h1>
        </div>
        <Button asChild variant="accent" className="shrink-0">
          <Link href="/new">
            <Plus className="h-4 w-4" />
            {t.history.newInterview}
          </Link>
        </Button>
      </header>

      <SessionFilters
        difficulty={difficulty}
        interviewType={interviewType}
        onDifficultyChange={setDifficulty}
        onInterviewTypeChange={setInterviewType}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-tile" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 && hasActiveFilters ? (
        <EmptyState filtered onClearFilters={clearFilters} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((session, i) => (
            <div
              key={session.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
            >
              <SessionCard session={session} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}

      {!loading && <DeleteAllData onDeleted={() => setSessions([])} />}
    </div>
  );
}
