"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, FilterX } from "lucide-react";

interface EmptyStateProps {
  /** When true, sessions exist but the active filters hide all of them. */
  filtered?: boolean;
  onClearFilters?: () => void;
}

export function EmptyState({ filtered = false, onClearFilters }: EmptyStateProps) {
  if (filtered) {
    return (
      <div className="sheet flex flex-col items-center gap-4 border-1.5 border-dashed border-line-strong px-6 py-12 text-center">
        <p className="eyebrow">[ no match ]</p>
        <p className="max-w-sm text-[13px] text-ink-2">
          No sessions match these filters.
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          <FilterX className="h-4 w-4" />
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="sheet flex flex-col items-center gap-4 border-1.5 border-dashed border-line-strong px-6 py-14 text-center">
      <p className="eyebrow">[ empty ]</p>
      <p className="max-w-sm text-[13px] text-ink-2">
        No interviews yet. Paste a job description and the first one takes about twenty minutes.
      </p>
      <Button asChild variant="accent">
        <Link href="/new">
          Start an interview <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
