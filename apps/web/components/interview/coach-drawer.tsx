"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { GraduationCap, Quote, Send, Square, X } from "lucide-react";
import type { CoachNoteView, CoachRequest } from "@interviewiq/types";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface CoachDrawerProps {
  open: boolean;
  onClose: () => void;
  notes: CoachNoteView[];
  currentQuestionId: string | null;
  draft: { request: CoachRequest; text: string } | null;
  isStreaming: boolean;
  error: { code: string; message: string } | null;
  onAsk: (prompt: string) => void;
  onCancel: () => void;
  modelLabel: string;
}

/** Render light markdown-ish text: paragraphs, bullets and `code`. */
function AnswerText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2 text-[13px] leading-relaxed text-ink">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l) || !l.trim());
        if (isList) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines
                .filter((l) => l.trim())
                .map((l, j) => (
                  <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""))}</li>
                ))}
            </ul>
          );
        }
        if (/^#{1,3}\s/.test(block)) {
          return (
            <p key={i} className="eyebrow pt-1 text-ink">
              {block.replace(/^#{1,3}\s/, "")}
            </p>
          );
        }
        return <p key={i}>{inline(block)}</p>;
      })}
    </div>
  );
}

function inline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded-[4px] border border-line-strong bg-sheet px-1 py-0.5 text-[12px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function NoteCard({ note, label }: { note: CoachNoteView; label: string }) {
  return (
    <article className="tile p-4 animate-pop-in">
      {note.selection && (
        <blockquote className="sheet mb-3 flex gap-2 px-3 py-2 text-[12px] italic text-ink-2">
          <Quote className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span className="line-clamp-4">{note.selection}</span>
        </blockquote>
      )}
      {note.prompt && !note.selection && (
        <p className="mb-2 text-[13px] font-semibold text-ink">{note.prompt}</p>
      )}
      {note.prompt && note.selection && note.prompt !== "Explain this" && (
        <p className="mb-2 text-[13px] font-semibold text-ink">{note.prompt}</p>
      )}
      <AnswerText text={note.answer} />
      <p className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span className={cn("led", note.askedBeforeAnswer ? "bg-butter-deep text-butter-deep/40" : "bg-sage-deep text-sage-deep/40")} aria-hidden />
        {label}
      </p>
    </article>
  );
}

export function CoachDrawer({
  open,
  onClose,
  notes,
  currentQuestionId,
  draft,
  isStreaming,
  error,
  onAsk,
  onCancel,
  modelLabel,
}: CoachDrawerProps) {
  const { t } = useI18n();
  const C = t.interview.coach;
  const [prompt, setPrompt] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const current = notes.filter((n) => n.questionId === currentQuestionId);
  const earlier = notes.filter((n) => n.questionId !== currentQuestionId);

  // Keep the newest content in view while streaming
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, draft?.text, notes.length]);

  useEffect(() => {
    if (open && !isStreaming) inputRef.current?.focus();
  }, [open, isStreaming]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = prompt.trim();
    if (!value || isStreaming) return;
    onAsk(value);
    setPrompt("");
  };

  return (
    <aside
      aria-label={C.title}
      inert={!open}
      aria-hidden={!open}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex max-h-[85vh] flex-col transition-transform duration-300 ease-pop sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[26rem] sm:p-3",
        open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-[110%] sm:translate-y-0",
      )}
    >
      <div className="tile flex h-full flex-col overflow-hidden rounded-b-none sm:rounded-b-tile">
        {/* Title strip */}
        <div className="flex items-center justify-between gap-3 border-b-1.5 border-ink bg-lavender px-4 py-2.5 text-lavender-deep">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border-1.5 border-ink bg-card text-lavender-deep shadow-pop-sm">
              <GraduationCap className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-extrabold leading-tight">{C.title}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] opacity-80">{C.eyebrow}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={C.close}
            className="tile-pop tile-pop-press flex h-8 w-8 items-center justify-center rounded-md shadow-pop-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thread */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-paper-2 p-4">
          {current.length === 0 && !draft && (
            <p className="sheet px-4 py-5 text-center text-[12px] text-muted-foreground">{C.empty}</p>
          )}
          {current.map((n) => (
            <NoteCard key={n.id} note={n} label={n.askedBeforeAnswer ? C.beforeAnswer : C.afterAnswer} />
          ))}

          {draft && (
            <article className="tile border-dashed p-4">
              {draft.request.selection && (
                <blockquote className="sheet mb-3 flex gap-2 px-3 py-2 text-[12px] italic text-ink-2">
                  <Quote className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  <span className="line-clamp-4">{draft.request.selection}</span>
                </blockquote>
              )}
              {draft.request.prompt && (
                <p className="mb-2 text-[13px] font-semibold text-ink">{draft.request.prompt}</p>
              )}
              {draft.text ? (
                <AnswerText text={draft.text} />
              ) : (
                <p className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <span className="led led-live bg-lavender-deep text-lavender-deep/40" aria-hidden />
                  {C.thinking}
                </p>
              )}
              {isStreaming && (
                <span className="ml-0.5 inline-block h-[1em] w-[0.55ch] translate-y-[2px] bg-ink animate-caret" aria-hidden />
              )}
            </article>
          )}

          {error && (
            <p className="rounded-md border-1.5 border-ink bg-blush px-3 py-2 text-[12px] text-blush-deep">
              {error.message}
            </p>
          )}

          {earlier.length > 0 && (
            <details className="pt-2">
              <summary className="eyebrow cursor-pointer select-none">
                {C.otherQuestions} · {earlier.length}
              </summary>
              <div className="mt-3 space-y-3">
                {earlier.map((n) => (
                  <NoteCard key={n.id} note={n} label={n.askedBeforeAnswer ? C.beforeAnswer : C.afterAnswer} />
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Composer */}
        <form onSubmit={submit} className="border-t-1.5 border-ink bg-card p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(e);
                }
              }}
              rows={2}
              maxLength={600}
              placeholder={C.placeholder}
              disabled={isStreaming}
              className="min-h-[2.75rem] flex-1 resize-none rounded-md border-1.5 border-line-strong bg-sheet px-3 py-2 text-[13px] text-ink shadow-inset placeholder:text-muted-foreground/80 focus-visible:border-ink focus-visible:outline-none focus-visible:shadow-pop-sm disabled:opacity-60"
            />
            {isStreaming ? (
              <Button type="button" variant="outline" size="icon" onClick={onCancel} aria-label={C.cancel}>
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" variant="accent" size="icon" disabled={!prompt.trim()} aria-label={C.send}>
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>
              {C.model} · {modelLabel}
            </span>
            <span className="flex items-center gap-1">
              <span className="kbd">Enter</span> {C.send}
            </span>
          </p>
        </form>
      </div>
    </aside>
  );
}
