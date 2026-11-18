"use client";

import { getClientId } from "@/lib/client-id";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CoachNoteView, CoachRequest, CoachStreamEvent } from "@interviewiq/types";

export interface CoachAskResult {
  ok: boolean;
  note?: CoachNoteView;
  error?: { code: string; message: string };
}

/**
 * Mid-interview coach: loads this session's notes and streams new answers from
 * POST /api/interview/[id]/coach (NDJSON). One request at a time.
 */
export function useCoach(sessionId: string, enabled: boolean) {
  const [notes, setNotes] = useState<CoachNoteView[]>([]);
  const [model, setModel] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ request: CoachRequest; text: string } | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore notes after a refresh
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch(`/api/interview/${sessionId}/coach`, { headers: { "x-client-id": getClientId() } })
      .then((r) => (r.ok ? r.json() : { notes: [] }))
      .then((data: { notes?: CoachNoteView[]; model?: string }) => {
        if (cancelled) return;
        if (Array.isArray(data.notes)) setNotes(data.notes);
        if (typeof data.model === "string") setModel(data.model);
      })
      .catch(() => {
        // Non-critical; the drawer simply starts empty
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, enabled]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = useCallback(
    async (request: CoachRequest): Promise<CoachAskResult> => {
      if (isStreaming) return { ok: false, error: { code: "BUSY", message: "busy" } };
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setDraft({ request, text: "" });
      setIsStreaming(true);

      try {
        const res = await fetch(`/api/interview/${sessionId}/coach`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-client-id": getClientId() },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          const err = {
            code: typeof data?.code === "string" ? data.code : `HTTP_${res.status}`,
            message: typeof data?.error === "string" ? data.error : `Request failed (${res.status})`,
          };
          setError(err);
          setDraft(null);
          return { ok: false, error: err };
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";
        let finalNote: CoachNoteView | undefined;
        let streamError: { code: string; message: string } | undefined;

        const handle = (line: string) => {
          if (!line.trim()) return;
          let event: CoachStreamEvent;
          try {
            event = JSON.parse(line) as CoachStreamEvent;
          } catch {
            return;
          }
          if (event.type === "delta") {
            text += event.text;
            setDraft({ request, text });
          } else if (event.type === "done") {
            finalNote = event.note;
          } else if (event.type === "error") {
            streamError = { code: event.code, message: event.message };
          }
        };

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) handle(line);
        }
        if (buffer) handle(buffer);

        if (streamError) {
          setError(streamError);
          setDraft(null);
          return { ok: false, error: streamError };
        }
        if (finalNote) {
          setNotes((prev) => [...prev, finalNote!]);
        }
        setDraft(null);
        return { ok: true, note: finalNote };
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setDraft(null);
          return { ok: false, error: { code: "ABORTED", message: "aborted" } };
        }
        const e = { code: "NETWORK", message: err instanceof Error ? err.message : "Network error" };
        setError(e);
        setDraft(null);
        return { ok: false, error: e };
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, isStreaming],
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  const clearError = useCallback(() => setError(null), []);

  return { notes, model, draft, isStreaming, error, ask, cancel, clearError };
}
