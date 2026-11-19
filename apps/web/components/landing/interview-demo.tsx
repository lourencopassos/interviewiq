"use client";

import { useEffect, useMemo, useState } from "react";
import { Mic, CornerDownRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { scoreTone, toneStyles } from "@/lib/score";

/**
 * The hero's signature: a looping, scripted interview that shows the product's
 * rhythm — a question types in, the candidate talks, a score lands, and when
 * the score is low the interviewer digs in with a follow-up.
 */

interface Beat {
  question: string;
  score: number;
  tier: Tier;
  feedback: string;
  followUp?: string;
}

type Tier = "poor" | "good" | "excellent";

/** Scores and evaluator tiers for the three scripted beats; the copy lives in the dictionary. */
const SCORES: { score: number; tier: Tier }[] = [
  { score: 82, tier: "excellent" },
  { score: 58, tier: "poor" },
  { score: 91, tier: "excellent" },
];

type Phase = "typing" | "listening" | "scoring" | "followup";

export function InterviewDemo({ className }: { className?: string }) {
  const { t } = useI18n();
  const D = t.landing.demo;
  const script = useMemo<Beat[]>(
    () =>
      D.script.map((b, i) => ({
        question: b.question,
        feedback: b.feedback,
        followUp: "followUp" in b ? (b as { followUp?: string }).followUp : undefined,
        ...(SCORES[i] ?? { score: 70, tier: "good" }),
      })),
    [D.script],
  );
  const [beat, setBeat] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [typed, setTyped] = useState(0);
  const [reduced, setReduced] = useState(false);

  const current = script[beat];
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
  }, [text, phase, reduced]);

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
          setBeat((b) => (b + 1) % script.length);
          setPhase("typing");
        }
      }, 2200);
    }
    return () => clearTimeout(id);
  }, [phase, reduced, text, current, script.length]);

  const tone = toneStyles[scoreTone(current.score)];
  const showScore = phase === "scoring" || reduced;
  const isFollowUp = phase === "followup";

  return (
    <div
      className={cn("tile relative overflow-hidden", className)}
      aria-label={D.live}
    >
      {/* Title strip */}
      <div className="flex items-center justify-between gap-3 border-b-1.5 border-ink bg-sheet px-4 py-2.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
          <span className="led led-live bg-rust text-rust/40" aria-hidden />
          {D.live}
        </div>
        <ol className="hidden items-center gap-1 sm:flex" aria-hidden>
          {script.map((_, i) => (
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
              <span className="eyebrow">{D.interviewer}</span>
              {isFollowUp && (
                <span className="pill animate-pop-in bg-lavender text-lavender-deep">
                  <CornerDownRight className="h-3 w-3" /> {D.followUp}
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
            {D.you}
          </div>
          <div className="flex min-h-[2.75rem] min-w-0 flex-1 items-center">
            {phase === "listening" || reduced ? (
              <div className="flex h-9 items-center gap-[3px]" aria-label={D.recordingAnswer}>
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
                  {D.listening}
                </span>
              </div>
            ) : phase === "typing" || phase === "followup" ? (
              <span className="text-[12px] text-muted-foreground">{D.waiting}</span>
            ) : (
              <span className="text-[12px] text-muted-foreground">{D.transcribed}</span>
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
                tone.tile,
              )}
            >
              <span className="text-xl font-extrabold tabular-nums">{current.score}</span>
              <span className="pill border-ink/70 bg-card/70">{t.common.tier[current.tier]}</span>
              <span className="truncate text-[12px]">{current.feedback}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer hints */}
      <div className="flex items-center justify-between border-t border-line bg-paper-2 px-4 py-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="kbd">Space</span> {D.record}
          <span className="kbd ml-2">R</span> {D.replay}
        </span>
        <span className="font-semibold uppercase tracking-[0.14em]">{D.rule}</span>
      </div>
    </div>
  );
}
