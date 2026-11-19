"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";

/** Delay before re-asking after a failure (D-ID's concurrent-stream quota needs idle streams to expire). */
const RETRY_BACKOFF_MS = [5000, 15000, 45000, 90000];
const MAX_ATTEMPTS = RETRY_BACKOFF_MS.length;
/** Never ask more often than this, whatever triggers a re-evaluation. */
const MIN_INTERVAL_MS = 4000;

interface AvatarOfferOptions {
  sessionId: string;
  /** Video mode with a real avatar (not mock mode). */
  enabled: boolean;
  /** A live peer connection exists. */
  connected: boolean;
  /** Stream id of the offer in hand, if any. */
  streamId: string | null;
  /** The peer connection or the server reported a failure. */
  failed: boolean;
}

/**
 * Ask the server for a D-ID offer whenever video mode has no live peer: on
 * first load, after a reload, and up to four times after a failure, with
 * back-off. The offer itself arrives over SSE (`avatar_stream_ready`).
 * Scheduling through a cleared-on-cleanup timer makes Strict Mode's double
 * mount ask only once.
 */
export function useAvatarOffers({
  sessionId,
  enabled,
  connected,
  streamId,
  failed,
}: AvatarOfferOptions) {
  const attemptsRef = useRef(0);
  const lastRequestAtRef = useRef(0);
  // Failed offer requests (network, rate limit, or no stream created). A
  // counter, so each failure re-runs the effect below.
  const [requestFailures, setRequestFailures] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (connected) {
      attemptsRef.current = 0;
      return;
    }
    const failing = failed || requestFailures > 0;
    if (streamId && !failing) return; // offer in hand, negotiating
    if (attemptsRef.current >= MAX_ATTEMPTS) return;

    const backoff = failing ? RETRY_BACKOFF_MS[attemptsRef.current] : 0;
    const throttle = MIN_INTERVAL_MS - (Date.now() - lastRequestAtRef.current);
    const timer = setTimeout(
      () => {
        lastRequestAtRef.current = Date.now();
        attemptsRef.current += 1;
        apiFetch<{ ok: boolean }>(`/api/interview/${sessionId}/avatar-offer`, { method: "POST" })
          .then(({ ok }) => setRequestFailures((n) => (ok ? 0 : n + 1)))
          .catch(() => setRequestFailures((n) => n + 1));
      },
      Math.max(backoff, throttle, 0),
    );
    return () => clearTimeout(timer);
  }, [sessionId, enabled, connected, streamId, failed, requestFailures]);
}
