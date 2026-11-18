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
  return (
    <div className="sheet flex flex-wrap items-center gap-3 p-3">
      <span className="eyebrow hidden pl-1 sm:inline">filter</span>

      <Select value={difficulty} onValueChange={onDifficultyChange}>
        <SelectTrigger className="w-[150px]" aria-label="Difficulty">
          <SelectValue placeholder="Difficulty" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All levels</SelectItem>
          <SelectItem value="JUNIOR">Junior</SelectItem>
          <SelectItem value="MID">Mid</SelectItem>
          <SelectItem value="SENIOR">Senior</SelectItem>
          <SelectItem value="STAFF">Staff</SelectItem>
        </SelectContent>
      </Select>

      <Select value={interviewType} onValueChange={onInterviewTypeChange}>
        <SelectTrigger className="w-[180px]" aria-label="Interview type">
          <SelectValue placeholder="Interview type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="PHONE_SCREEN">Phone screen</SelectItem>
          <SelectItem value="TECHNICAL">Technical</SelectItem>
          <SelectItem value="BEHAVIORAL">Behavioral</SelectItem>
          <SelectItem value="SYSTEM_DESIGN">System design</SelectItem>
          <SelectItem value="FULL_LOOP">Full loop</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && onClearFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="ml-auto">
          <FilterX className="h-3.5 w-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
