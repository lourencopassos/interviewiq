"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getMockMode } from "@/lib/mock-mode";

interface PlaybackOptions {
  /** In mock mode, speak this text with SpeechSynthesis instead of fetching `url`. */
  mockText?: string;
  /** Fired when this item actually starts playing (after anything queued before it). */
  onStart?: () => void;
}

interface QueueItem {
  url: string;
  options: PlaybackOptions;
  resolve: () => void;
  reject: (error: Error) => void;
}

/**
 * Sequential audio playback. Every `play`/`enqueue` call is appended to a
 * queue and starts only after the previous item finished, so a stage
 * transition narration is never cut off by the next question's audio.
 */
export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);

  const queueRef = useRef<QueueItem[]>([]);
  const currentRef = useRef<QueueItem | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const disposedRef = useRef(false);

  const finishCurrent = useCallback((error?: Error) => {
    const item = currentRef.current;
    currentRef.current = null;
    audioRef.current = null;
    utteranceRef.current = null;
    if (!item) return;
    if (error) item.reject(error);
    else item.resolve();
  }, []);

  const processQueue = useCallback(() => {
    if (disposedRef.current) return;
    if (currentRef.current) return; // something is already playing

    const next = queueRef.current.shift();
    if (!next) {
      setIsPlaying(false);
      return;
    }

    currentRef.current = next;
    setIsPlaying(true);
    next.options.onStart?.();

    const { url, options } = next;

    // In mock mode with text available, use browser SpeechSynthesis
    if (
      options.mockText &&
      getMockMode() &&
      typeof window !== "undefined" &&
      window.speechSynthesis
    ) {
      // Clear any stray utterance (nothing of ours should be active here)
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(options.mockText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utteranceRef.current = utterance;

      let settled = false;
      const settle = (error?: Error) => {
        if (settled) return;
        settled = true;
        finishCurrent(error);
        processQueue();
      };

      utterance.onend = () => settle();
      utterance.onerror = (e) => {
        // "interrupted"/"canceled" are expected when stop() is called
        if (e.error !== "interrupted" && e.error !== "canceled") {
          console.warn("SpeechSynthesis error:", e.error);
        }
        settle();
      };

      window.speechSynthesis.speak(utterance);
      return;
    }

    // Standard audio playback
    const audio = new Audio(url);
    audioRef.current = audio;

    let settled = false;
    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      audio.onended = null;
      audio.onerror = null;
      finishCurrent(error);
      processQueue();
    };

    audio.onended = () => settle();
    audio.onerror = () => settle(new Error("Audio playback failed"));

    audio.play().catch((err: unknown) => {
      settle(err instanceof Error ? err : new Error("Audio playback failed"));
    });
  }, [finishCurrent]);

  /**
   * Queue `url` to play after everything already queued. Resolves when this
   * item finishes; rejects if it fails to play (the queue keeps going).
   */
  const enqueue = useCallback(
    (url: string, options: PlaybackOptions = {}): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        queueRef.current.push({ url, options, resolve, reject });
        processQueue();
      });
    },
    [processQueue],
  );

  /**
   * Same as `enqueue`. Kept for call sites that only ever play one clip;
   * it never interrupts audio that is already playing.
   */
  const play = useCallback(
    (url: string, mockText?: string): Promise<void> =>
      enqueue(url, { mockText }),
    [enqueue],
  );

  /** Pause the current clip (the queue is kept). */
  const pause = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis && utteranceRef.current) {
      window.speechSynthesis.pause();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  /** Stop the current clip and drop everything queued behind it. */
  const stop = useCallback(() => {
    const pending = queueRef.current;
    queueRef.current = [];

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.currentTime = 0;
    }

    // Resolve (not reject) so awaiting callers can proceed normally
    finishCurrent();
    pending.forEach((item) => item.resolve());
    setIsPlaying(false);
  }, [finishCurrent]);

  // Silence everything on unmount
  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      queueRef.current = [];
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
      }
      currentRef.current = null;
      audioRef.current = null;
      utteranceRef.current = null;
    };
  }, []);

  return { isPlaying, play, enqueue, pause, stop };
}
