"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, FilterX } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface EmptyStateProps {
  /** When true, sessions exist but the active filters hide all of them. */
  filtered?: boolean;
  onClearFilters?: () => void;
}

export function EmptyState({ filtered = false, onClearFilters }: EmptyStateProps) {
  const { t } = useI18n();

  if (filtered) {
    const copy = t.history.noMatch;
    return (
      <div className="sheet flex flex-col items-center gap-4 border-1.5 border-dashed border-line-strong px-6 py-12 text-center">
        <p className="eyebrow">{copy.eyebrow}</p>
        <p className="max-w-sm text-[13px] text-ink-2">{copy.body}</p>
        <Button variant="outline" onClick={onClearFilters}>
          <FilterX className="h-4 w-4" />
          {copy.clear}
        </Button>
      </div>
    );
  }

  const copy = t.history.empty;
  return (
    <div className="sheet flex flex-col items-center gap-4 border-1.5 border-dashed border-line-strong px-6 py-14 text-center">
      <p className="eyebrow">{copy.eyebrow}</p>
      <p className="max-w-sm text-[13px] text-ink-2">{copy.body}</p>
      <Button asChild variant="accent">
        <Link href="/new">
          {copy.start} <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
