"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreTone, toneStyles } from "./score-tone";

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
}

interface QuestionReviewProps {
  questions: ReviewQuestion[];
}

const categoryTone: Record<string, string> = {
  technical: "bg-sky text-sky-deep",
  behavioral: "bg-peach text-peach-deep",
  system_design: "bg-lavender text-lavender-deep",
  culture_fit: "bg-butter text-butter-deep",
};

function QuestionCard({ question }: { question: ReviewQuestion }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `question-review-${question.id}`;
  const tone = question.score !== null ? toneStyles[scoreTone(question.score)] : null;

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
            q{String(question.order + 1).padStart(2, "0")}
          </span>
          <span className="truncate text-[13px] font-semibold text-ink">{question.text}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn("pill hidden sm:inline-flex", categoryTone[question.category] ?? "bg-card")}>
            {question.category.replace(/_/g, " ")}
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
                  <span className="text-sky-deep">you said</span>
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{question.transcript}</p>
              </div>
            )}

            {question.feedback && (
              <div>
                <p className="eyebrow">interviewer&apos;s notes</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{question.feedback}</p>
              </div>
            )}

            {(question.strengths.length > 0 || question.gaps.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {question.strengths.length > 0 && (
                  <div>
                    <p className="eyebrow mb-1.5">strengths</p>
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
                    <p className="eyebrow mb-1.5">gaps</p>
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
  if (questions.length === 0) return null;

  return (
    <section aria-label="Question review">
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">
          <span className="text-ink">[ question review ]</span> your words next to the notes
        </p>
        <span className="pill bg-card tabular-nums">{questions.length} answered</span>
      </div>
      <div className="space-y-3">
        {questions.map((q) => (
          <QuestionCard key={q.id} question={q} />
        ))}
      </div>
    </section>
  );
}
