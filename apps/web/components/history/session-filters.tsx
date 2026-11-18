"use client";

import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";

interface SessionFiltersProps {
  difficulty: string;
  interviewType: string;
  onDifficultyChange: (value: string) => void;
  onInterviewTypeChange: (value: string) => void;
  /** Optional: shows a Clear filters button inside the row when true. */
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function SessionFilters({
  difficulty,
  interviewType,
  onDifficultyChange,
  onInterviewTypeChange,
  hasActiveFilters = false,
  onClearFilters,
}: SessionFiltersProps) {
  const { t } = useI18n();
  const copy = t.history.filters;

  return (
    <div className="sheet flex flex-wrap items-center gap-3 p-3">
      <span className="eyebrow hidden pl-1 sm:inline">{copy.label}</span>

      <Select value={difficulty} onValueChange={onDifficultyChange}>
        <SelectTrigger className="w-[150px]" aria-label={copy.difficulty}>
          <SelectValue placeholder={copy.difficulty} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{copy.allLevels}</SelectItem>
          <SelectItem value="JUNIOR">{t.common.difficulty.JUNIOR}</SelectItem>
          <SelectItem value="MID">{t.common.difficulty.MID}</SelectItem>
          <SelectItem value="SENIOR">{t.common.difficulty.SENIOR}</SelectItem>
          <SelectItem value="STAFF">{t.common.difficulty.STAFF}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={interviewType} onValueChange={onInterviewTypeChange}>
        <SelectTrigger className="w-[180px]" aria-label={copy.interviewType}>
          <SelectValue placeholder={copy.interviewType} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{copy.allTypes}</SelectItem>
          <SelectItem value="PHONE_SCREEN">{t.common.interviewType.PHONE_SCREEN}</SelectItem>
          <SelectItem value="TECHNICAL">{t.common.interviewType.TECHNICAL}</SelectItem>
          <SelectItem value="BEHAVIORAL">{t.common.interviewType.BEHAVIORAL}</SelectItem>
          <SelectItem value="SYSTEM_DESIGN">{t.common.interviewType.SYSTEM_DESIGN}</SelectItem>
          <SelectItem value="FULL_LOOP">{t.common.interviewType.FULL_LOOP}</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && onClearFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="ml-auto">
          <FilterX className="h-3.5 w-3.5" />
          {copy.clear}
        </Button>
      )}
    </div>
  );
}
