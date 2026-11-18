"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@interviewiq/ui/lib/utils";

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

const categoryColors: Record<string, string> = {
  technical: "bg-blue-500/20 text-blue-400",
  behavioral: "bg-green-500/20 text-green-400",
  system_design: "bg-amber-500/20 text-amber-400",
  culture_fit: "bg-violet-500/20 text-violet-400",
};

function scoreColor(score: number): string {
  if (score >= 75) return "bg-green-500/20 text-green-400";
  if (score >= 55) return "bg-yellow-500/20 text-yellow-400";
  if (score >= 40) return "bg-orange-500/20 text-orange-400";
  return "bg-red-500/20 text-red-400";
}

function QuestionCard({ question }: { question: ReviewQuestion }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {question.order + 1}
          </span>
          <span className="truncate text-sm">{question.text}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge className={categoryColors[question.category] ?? "bg-muted"}>
            {question.category.replace("_", " ")}
          </Badge>
          {question.score !== null && (
            <Badge className={scoreColor(question.score)}>{question.score}</Badge>
          )}
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      <div
        className={cn(
          "grid transition-all duration-200",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="border-t pt-4 space-y-4">
            {question.transcript && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Your Answer</p>
                <p className="text-sm mt-1">{question.transcript}</p>
              </div>
            )}

            {question.feedback && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Feedback</p>
                <p className="text-sm mt-1">{question.feedback}</p>
              </div>
            )}

            {question.strengths.length > 0 && (
              <div>
                <p className="text-sm font-medium text-green-400">Strengths</p>
                <ul className="mt-1 list-disc pl-4 text-sm text-muted-foreground">
                  {question.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {question.gaps.length > 0 && (
              <div>
                <p className="text-sm font-medium text-orange-400">Gaps</p>
                <ul className="mt-1 list-disc pl-4 text-sm text-muted-foreground">
                  {question.gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

export function QuestionReview({ questions }: QuestionReviewProps) {
  if (questions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Question-by-Question Review</h3>
      {questions.map((q) => (
        <QuestionCard key={q.id} question={q} />
      ))}
    </div>
  );
}
