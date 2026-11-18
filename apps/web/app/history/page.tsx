"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus } from "lucide-react";
import { getClientId } from "@/lib/client-id";
import { SessionCard } from "@/components/history/session-card";
import { SessionFilters } from "@/components/history/session-filters";
import { EmptyState } from "@/components/history/empty-state";

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
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState("all");
  const [interviewType, setInterviewType] = useState("all");

  const fetchSessions = useCallback(async () => {
    try {
      const clientId = getClientId();
      if (!clientId) return;

      const res = await fetch(`/api/sessions?clientId=${clientId}`);
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

  const handleDelete = useCallback(async (id: string) => {
    const clientId = getClientId();
    let res: Response;
    try {
      res = await fetch(
        `/api/sessions/${id}?clientId=${encodeURIComponent(clientId)}`,
        { method: "DELETE" },
      );
    } catch (error) {
      console.error("Failed to delete session:", error);
      throw new Error("Network error — could not delete session");
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message =
        res.status === 403
          ? "You can only delete your own sessions"
          : res.status === 404
            ? "Session no longer exists"
            : typeof data?.error === "string"
              ? data.error
              : `Failed to delete session (${res.status})`;
      if (res.status === 404) {
        // Already gone — drop it from the list rather than erroring
        setSessions((prev) => prev.filter((s) => s.id !== id));
        return;
      }
      throw new Error(message);
    }

    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

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
    <div className="container py-8 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Interview History</h1>
        </div>
        <Link href="/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Interview
          </Button>
        </Link>
      </div>

      <SessionFilters
        difficulty={difficulty}
        interviewType={interviewType}
        onDifficultyChange={setDifficulty}
        onInterviewTypeChange={setInterviewType}
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 && hasActiveFilters ? (
        <EmptyState filtered onClearFilters={clearFilters} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
