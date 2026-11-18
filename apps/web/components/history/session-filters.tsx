"use client";

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
}

export function SessionFilters({
  difficulty,
  interviewType,
  onDifficultyChange,
  onInterviewTypeChange,
}: SessionFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select value={difficulty} onValueChange={onDifficultyChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Difficulty" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Levels</SelectItem>
          <SelectItem value="JUNIOR">Junior</SelectItem>
          <SelectItem value="MID">Mid</SelectItem>
          <SelectItem value="SENIOR">Senior</SelectItem>
          <SelectItem value="STAFF">Staff</SelectItem>
        </SelectContent>
      </Select>

      <Select value={interviewType} onValueChange={onInterviewTypeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Interview Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="PHONE_SCREEN">Phone Screen</SelectItem>
          <SelectItem value="TECHNICAL">Technical</SelectItem>
          <SelectItem value="BEHAVIORAL">Behavioral</SelectItem>
          <SelectItem value="SYSTEM_DESIGN">System Design</SelectItem>
          <SelectItem value="FULL_LOOP">Full Loop</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
