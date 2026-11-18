"use client";

import { useEffect, useState } from "react";
import { Mic, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The hero's signature: a looping, scripted interview that shows the product's
 * rhythm — a question types in, the candidate talks, a score lands, and when
 * the score is low the interviewer digs in with a follow-up.
 */

interface Beat {
  question: string;
  score: number;
  feedback: string;
  followUp?: string;
}

const SCRIPT: Beat[] = [
  {
    question: "Stripe's dashboard renders thousands of rows. Where does React start to hurt, and what would you reach for first?",
    score: 82,
    feedback: "Good instinct to measure before memoizing.",
  },
  {
    question: "You said virtualization. How do you keep keyboard navigation and screen readers working inside a virtualized table?",
    score: 58,
    feedback: "Let's dig into the accessibility piece.",
    followUp: "Walk me through what aria-rowindex buys you here.",
  },
  {
    question: "Tell me about a time you pushed back on a design decision and were wrong.",
    score: 91,
    feedback: "Specific, honest, and you named what changed.",
  },
];

type Phase = "typing" | "listening" | "scoring" | "followup";

function tone(score: number) {
  if (score >= 80) return { bg: "bg-sage", fg: "text-sage-deep", label: "excellent" };
  if (score >= 65) return { bg: "bg-butter", fg: "text-butter-deep", label: "good" };
  return { bg: "bg-blush", fg: "text-blush-deep", label: "needs depth" };
}

export function InterviewDemo({ className }: { className?: string }) {
  const [beat, setBeat] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [typed, setTyped] = useState(0);
  const [reduced, setReduced] = useState(false);

  const current = SCRIPT[beat];
  const text = phase === "followup" && current.followUp ? current.followUp : current.question;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Typewriter
  useEffect(() => {
    if (reduced) {
      setTyped(text.length);
      return;
    }
    if (phase !== "typing" && phase !== "followup") return;
    setTyped(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= text.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, phase, reduced]);

  // Phase machine
  useEffect(() => {
    if (reduced) return;
    let id: ReturnType<typeof setTimeout>;
    const typingMs = text.length * 22 + 500;
    if (phase === "typing" || phase === "followup") {
      id = setTimeout(() => setPhase("listening"), typingMs);
    } else if (phase === "listening") {
      id = setTimeout(() => setPhase("scoring"), 2600);
    } else if (phase === "scoring") {
      id = setTimeout(() => {
        if (current.followUp && phase === "scoring" && text === current.question) {
          setPhase("followup");
        } else {
          setBeat((b) => (b + 1) % SCRIPT.length);
          setPhase("typing");
        }
      }, 2200);
    }
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, beat, reduced]);

  const t = tone(current.score);
  const showScore = phase === "scoring" || reduced;
  const isFollowUp = phase === "followup";

  return (
    <div
      className={cn("tile relative overflow-hidden", className)}
      aria-label="Animated preview of an InterviewIQ session"
    >
      {/* Title strip */}
      <div className="flex items-center justify-between gap-3 border-b-1.5 border-ink bg-sheet px-4 py-2.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
          <span className="led led-live bg-rust text-rust/40" aria-hidden />
          Live · Senior Frontend · Stripe
        </div>
        <ol className="hidden items-center gap-1 sm:flex" aria-hidden>
          {SCRIPT.map((_, i) => (
            <li
              key={i}
              className={cn(
                "h-1.5 w-6 rounded-full border border-ink transition-colors duration-300",
                i < beat ? "bg-ink" : i === beat ? "bg-sage" : "bg-transparent",
              )}
            />
          ))}
        </ol>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {/* Interviewer */}
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-1.5 border-ink bg-peach text-peach-deep shadow-pop-sm">
            <Mic className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="eyebrow">Interviewer</span>
              {isFollowUp && (
                <span className="pill animate-pop-in bg-lavender text-lavender-deep">
                  <CornerDownRight className="h-3 w-3" /> follow-up
                </span>
              )}
            </div>
            <p className="min-h-[3.75rem] text-[14px] font-medium leading-relaxed text-ink">
              {text.slice(0, typed)}
              {typed < text.length && (
                <span className="ml-0.5 inline-block h-[1.05em] w-[0.55ch] translate-y-[2px] bg-ink animate-caret" aria-hidden />
              )}
            </p>
          </div>
        </div>

        {/* Candidate */}
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-1.5 border-ink bg-sky text-sky-deep shadow-pop-sm text-[11px] font-extrabold">
            you
          </div>
          <div className="flex min-h-[2.75rem] min-w-0 flex-1 items-center">
            {phase === "listening" || reduced ? (
              <div className="flex h-9 items-center gap-[3px]" aria-label="Recording answer">
                {Array.from({ length: 28 }).map((_, i) => (
                  <span
                    key={i}
                    className="block w-[3px] origin-center rounded-full bg-sky-deep animate-wave-bar"
                    style={{
                      height: `${10 + ((i * 7) % 18)}px`,
                      animationDelay: `${(i % 7) * 90}ms`,
                      animationDuration: `${700 + (i % 5) * 110}ms`,
                    }}
                  />
                ))}
                <span className="ml-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  listening
                </span>
              </div>
            ) : phase === "typing" || phase === "followup" ? (
              <span className="text-[12px] text-muted-foreground">Waiting for the question to finish…</span>
            ) : (
              <span className="text-[12px] text-muted-foreground">Answer transcribed · 48s</span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="min-h-[3.25rem]">
          {showScore && (
            <div
              key={`${beat}-${isFollowUp}`}
              className={cn(
                "flex items-center gap-3 rounded-md border-1.5 border-ink px-3 py-2 shadow-pop-sm animate-pop-in",
                t.bg,
              )}
            >
              <span className={cn("text-xl font-extrabold tabular-nums", t.fg)}>{current.score}</span>
              <span className={cn("pill border-ink/70 bg-card/70", t.fg)}>{t.label}</span>
              <span className={cn("truncate text-[12px]", t.fg)}>{current.feedback}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer hints */}
      <div className="flex items-center justify-between border-t border-line bg-paper-2 px-4 py-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="kbd">Space</span> record
          <span className="kbd ml-2">R</span> replay
        </span>
        <span className="font-semibold uppercase tracking-[0.14em]">
          score &lt; 65 → follow-up
        </span>
      </div>
    </div>
  );
}
