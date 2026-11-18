"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Source = "question" | "transcript";

interface SelectionPopoverProps {
  enabled: boolean;
  onExplain: (selection: string, source: Source) => void;
}

interface Anchor {
  x: number;
  y: number;
  text: string;
  source: Source;
}

const MIN_CHARS = 3;
const MAX_CHARS = 2000;

/**
 * Floating "Explain this" button that appears above text the candidate
 * highlights inside an element marked `data-coach-source="question|transcript"`.
 */
export function SelectionPopover({ enabled, onExplain }: SelectionPopoverProps) {
  const { t } = useI18n();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!enabled) {
      setAnchor(null);
      return;
    }

    const update = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setAnchor(null);
        return;
      }
      const text = selection.toString().trim();
      if (text.length < MIN_CHARS) {
        setAnchor(null);
        return;
      }
      const range = selection.getRangeAt(0);
      const node =
        range.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? range.commonAncestorContainer.parentElement
          : (range.commonAncestorContainer as Element);
      const host = node?.closest<HTMLElement>("[data-coach-source]");
      if (!host) {
        setAnchor(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) {
        setAnchor(null);
        return;
      }
      setAnchor({
        x: rect.left + rect.width / 2,
        y: rect.top,
        text: text.slice(0, MAX_CHARS),
        source: (host.dataset.coachSource as Source) ?? "question",
      });
    };

    // Debounce so the button settles after the mouse is released
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const onPointerUp = () => setTimeout(update, 0);
    const onPointerDown = (e: PointerEvent) => {
      if (buttonRef.current?.contains(e.target as Node)) return;
      setAnchor(null);
    };

    document.addEventListener("selectionchange", schedule);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("keyup", onPointerUp);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", schedule);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("keyup", onPointerUp);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [enabled]);

  if (!anchor) return null;

  const left = Math.min(Math.max(anchor.x, 90), window.innerWidth - 90);
  const top = Math.max(anchor.y - 12, 56);

  return (
    <div
      style={{ left, top }}
      className="fixed z-50 -translate-x-1/2 -translate-y-full pb-2 print:hidden"
    >
      <button
        ref={buttonRef}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const { text, source } = anchor;
          setAnchor(null);
          window.getSelection()?.removeAllRanges();
          onExplain(text, source);
        }}
        className="tile-pop tile-pop-hover tile-pop-press inline-flex items-center gap-1.5 rounded-md bg-lavender px-3 py-1.5 text-[12px] font-bold text-lavender-deep shadow-pop animate-pop-in"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {t.interview.coach.explainThis}
      </button>
    </div>
  );
}
