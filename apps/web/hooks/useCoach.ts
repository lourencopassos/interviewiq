"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CoachNoteView, CoachRequest, CoachStreamEvent } from "@interviewiq/types";
import { ApiError, apiFetch, apiRequest } from "@/lib/api-client";
import { toUiError, type UiError } from "@/lib/errors";

/** Read NDJSON lines from a streamed response body, one parsed object per line. */
async function* readNdjson<T>(body: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const parse = (line: string): T | null => {
    if (!line.trim()) return null;
    try {
      return JSON.parse(line) as T;
    } catch {
      return null;
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const event = parse(line);
      if (event) yield event;
    }
  }
  const last = parse(buffer);
  if (last) yield last;
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
  const [error, setError] = useState<UiError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore notes after a refresh
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    apiFetch<{ notes?: CoachNoteView[]; model?: string }>(`/api/interview/${sessionId}/coach`)
      .then((data) => {
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
    async (request: CoachRequest): Promise<void> => {
      if (isStreaming) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setDraft({ request, text: "" });
      setIsStreaming(true);

      try {
        const res = await apiRequest(`/api/interview/${sessionId}/coach`, {
          method: "POST",
          json: request,
          signal: controller.signal,
        });
        if (!res.body) throw new ApiError("COACH_FAILED", { status: res.status, retryable: true });

        let text = "";
        for await (const event of readNdjson<CoachStreamEvent>(res.body)) {
          if (event.type === "delta") {
            text += event.text;
            setDraft({ request, text });
          } else if (event.type === "done") {
            setNotes((prev) => [...prev, event.note]);
          } else {
            throw new ApiError(event.code, { status: res.status, retryable: true });
          }
        }
      } catch (err) {
        // A cancelled request is the user's choice, not an error.
        if (!(err instanceof DOMException && err.name === "AbortError")) setError(toUiError(err));
      } finally {
        setDraft(null);
        setIsStreaming(false);
      }
    },
    [sessionId, isStreaming],
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  const clearError = useCallback(() => setError(null), []);

  return { notes, model, draft, isStreaming, error, ask, cancel, clearError };
}
