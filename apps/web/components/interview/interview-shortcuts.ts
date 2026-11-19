"use client";

import { useEffect } from "react";
import { useLatest } from "@/hooks/useLatest";

/** Each handler returns true when it acted, so the key's default is prevented. */
export interface InterviewShortcutHandlers {
  /** Escape: stop the interview (asks for confirmation). Always handled. */
  onStop: () => void;
  /** P: pause or resume. */
  onTogglePause: () => boolean;
  /** Space: start or finish recording. */
  onToggleRecording: () => boolean;
  /** R: replay the question. */
  onReplay: () => boolean;
}

function isTypingTarget(target: HTMLElement | null): boolean {
  if (!target) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * Interview keyboard shortcuts: Space records / stops, R replays, P pauses,
 * Escape stops. Ignored while typing in a field and when a modifier is held.
 * One window listener for the page's lifetime; it always calls the latest
 * handlers through a ref.
 */
export function useInterviewShortcuts(handlers: InterviewShortcutHandlers) {
  const handlersRef = useLatest(handlers);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const current = handlersRef.current;

      if (event.key === "Escape") {
        event.preventDefault();
        current.onStop();
        return;
      }

      const target = event.target as HTMLElement | null;
      if (isTypingTarget(target)) return;

      let handled = false;
      if (event.key === "p" || event.key === "P") {
        handled = current.onTogglePause();
      } else if (event.code === "Space") {
        // Space on a focused button activates that button instead.
        if (target?.closest("button, a, [role=button]")) return;
        handled = current.onToggleRecording();
      } else if (event.key === "r" || event.key === "R") {
        handled = current.onReplay();
      }
      if (handled) event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlersRef]);
}
