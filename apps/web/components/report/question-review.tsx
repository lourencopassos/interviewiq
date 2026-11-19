"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CoachNoteView } from "@interviewiq/types";
import { cn } from "@/lib/utils";
import { interpolate, LOCALE_TAGS, useI18n } from "@/lib/i18n";
import { label } from "@/lib/labels";
import { categoryTone, scoreTone, toneStyles } from "@/lib/score";

interface ReviewQuestion {
  id: string;
  order: number;
  text: string;
  category: string;
  transcript: string | null;
  score: number | null;
  feedback: string | null;
  strengths: string[];
  gaps: string[];
  /** Notes the candidate asked the coach for on this question, oldest first. */
  coachNotes?: CoachNoteView[];
  /** True when at least one of those notes was asked before the answer was recorded. */
  coachedBeforeAnswer?: boolean;
}

interface QuestionReviewProps {
  questions: ReviewQuestion[];
}

const pillTone = {
  sky: "bg-sky text-sky-deep",
  peach: "bg-peach text-peach-deep",
  lavender: "bg-lavender text-lavender-deep",
  butter: "bg-butter text-butter-deep",
} as const;

function QuestionCard({ question }: { question: ReviewQuestion }) {
  const { t, locale } = useI18n();
  const copy = t.report.questionReview;
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `question-review-${question.id}`;
  const tone = question.score !== null ? toneStyles[scoreTone(question.score)] : null;
  // Pills read lowercase by design; the shared labels are sentence case.
  const categoryLabel = label(t, "category", question.category).toLocaleLowerCase(LOCALE_TAGS[locale]);
  const tonePill = categoryTone[question.category];
  const coachNotes = question.coachNotes ?? [];
  const coachedBeforeAnswer = question.coachedBeforeAnswer ?? false;

  return (
    <div className="tile overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-sheet"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="eyebrow shrink-0 tabular-nums text-ink">
            {copy.questionPrefix}
            {String(question.order + 1).padStart(2, "0")}
          </span>
          <span className="truncate text-[13px] font-semibold text-ink">{question.text}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {coachedBeforeAnswer && (
            <span className="pill bg-lavender text-lavender-deep">{t.report.coach.coached}</span>
          )}
          <span className={cn("pill hidden sm:inline-flex", tonePill ? pillTone[tonePill] : "bg-card")}>
            {categoryLabel}
          </span>
          {question.score !== null && tone && (
            <span
              className={cn(
                "flex h-8 min-w-10 items-center justify-center rounded-md border-1.5 border-ink px-2 text-[13px] font-extrabold tabular-nums shadow-pop-sm",
                tone.tile,
              )}
            >
              {question.score}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </button>

      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-pop",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-line p-4">
            <p className="text-[13px] leading-relaxed text-ink sm:hidden">{question.text}</p>

            {question.transcript && (
              <div className="sheet p-4">
                <p className="eyebrow">
                  <span className="text-sky-deep">{copy.youSaid}</span>
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{question.transcript}</p>
              </div>
            )}

            {coachNotes.length > 0 && (
              <div className="rounded-tile border-1.5 border-ink bg-lavender p-4 text-lavender-deep">
                <p className="eyebrow text-current opacity-80">{t.report.coach.whatYouAsked}</p>
                <ul className="mt-2 space-y-3">
                  {coachNotes.map((note) => (
                    <li key={note.id} className="space-y-1.5">
                      {note.selection && (
                        <blockquote className="sheet border-l-[3px] border-l-lavender-deep px-3 py-2 text-[12px] italic leading-relaxed text-ink-2">
                          <span className="eyebrow mr-1.5 not-italic">{t.report.coach.highlighted}</span>
                          &ldquo;{note.selection}&rdquo;
                        </blockquote>
                      )}
                      <p className="text-[13px] font-bold leading-relaxed">{note.prompt}</p>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed opacity-90">
                        {note.answer}
                      </p>
                      <p className="eyebrow text-current opacity-60">
                        {t.report.coach.model} · {note.model}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {question.feedback && (
              <div>
                <p className="eyebrow">{copy.interviewerNotes}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{question.feedback}</p>
              </div>
            )}

            {(question.strengths.length > 0 || question.gaps.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {question.strengths.length > 0 && (
                  <div>
                    <p className="eyebrow mb-1.5">{copy.strengths}</p>
                    <ul className="flex flex-wrap gap-1.5">
                      {question.strengths.map((s, i) => (
                        <li key={i} className="pill bg-sage py-1 text-left font-medium text-sage-deep">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {question.gaps.length > 0 && (
                  <div>
                    <p className="eyebrow mb-1.5">{copy.gaps}</p>
                    <ul className="flex flex-wrap gap-1.5">
                      {question.gaps.map((g, i) => (
                        <li key={i} className="pill bg-blush py-1 text-left font-medium text-blush-deep">
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuestionReview({ questions }: QuestionReviewProps) {
  const { t } = useI18n();
  const copy = t.report.questionReview;
  if (questions.length === 0) return null;

  return (
    <section aria-label={copy.sectionLabel}>
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">
          <span className="text-ink">[ {copy.eyebrow} ]</span> {copy.tagline}
        </p>
        <span className="pill bg-card tabular-nums">
          {interpolate(copy.answered, { n: questions.length })}
        </span>
      </div>
      <div className="space-y-3">
        {questions.map((q) => (
          <QuestionCard key={q.id} question={q} />
        ))}
      </div>
    </section>
  );
}
