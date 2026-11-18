"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface TranscriptPreviewProps {
  transcript: string | null;
  isProcessing: boolean;
}

export function TranscriptPreview({
  transcript,
  isProcessing,
}: TranscriptPreviewProps) {
  if (!isProcessing && !transcript) return null;

  return (
    <div className="animate-in fade-in duration-300 rounded-lg border border-border/50 bg-muted/30 p-4">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Your answer
      </p>
      {transcript ? (
        <p className="text-sm text-foreground/80 leading-relaxed italic">
          &ldquo;{transcript}&rdquo;
        </p>
      ) : (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      )}
    </div>
  );
}
