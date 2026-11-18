"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TranscriptPreviewProps {
  transcript: string | null;
  isProcessing: boolean;
  /** Evaluation of this answer, once it lands. Rendered as a pop-in score tile. */
  score?: number;
  tier?: string;
}

function scoreTone(score: number): string {
  if (score >= 80) return "bg-sage text-sage-deep";
  if (score >= 65) return "bg-butter text-butter-deep";
  return "bg-blush text-blush-deep";
}

const tierLabels: Record<string, string> = {
  excellent: "excellent",
  good: "good",
  poor: "needs depth",
};

/** The candidate's row: a quiet sheet with the transcript, then the score tile. */
export function TranscriptPreview({
  transcript,
  isProcessing,
  score,
  tier,
}: TranscriptPreviewProps) {
  if (!isProcessing && !transcript) return null;

  return (
    <div className="sheet animate-fade-up p-4 sm:p-5">
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-1.5 border-ink bg-sky text-[11px] font-extrabold text-sky-deep shadow-pop-sm">
          you
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1.5">You said</p>
          {transcript ? (
            <p className="text-[13px] leading-relaxed text-ink-2">
              &ldquo;{transcript}&rdquo;
            </p>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
              <p className="eyebrow pt-1">transcribing…</p>
            </div>
          )}
        </div>
      </div>

      {score !== undefined ? (
        <div
          key={score}
          className={cn(
            "mt-4 flex items-center gap-3 rounded-md border-1.5 border-ink px-3 py-2 shadow-pop-sm animate-pop-in",
            scoreTone(score),
          )}
        >
          <span className="text-xl font-extrabold tabular-nums">{score}</span>
          {tier && (
            <span className="pill border-ink/70 bg-card/70">{tierLabels[tier] ?? tier}</span>
          )}
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
            score
          </span>
        </div>
      ) : (
        isProcessing && transcript && <p className="eyebrow mt-3">evaluating…</p>
      )}
    </div>
  );
}
