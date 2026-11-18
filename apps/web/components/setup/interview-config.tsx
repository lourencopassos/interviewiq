"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSetupStore } from "@/lib/stores/setup-store";
import type { Difficulty, InterviewType, Language } from "@interviewiq/types";

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "JUNIOR", label: "Junior" },
  { value: "MID", label: "Mid-Level" },
  { value: "SENIOR", label: "Senior" },
  { value: "STAFF", label: "Staff" },
];

const INTERVIEW_TYPE_OPTIONS: { value: InterviewType; label: string }[] = [
  { value: "PHONE_SCREEN", label: "Phone Screen" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "BEHAVIORAL", label: "Behavioral" },
  { value: "SYSTEM_DESIGN", label: "System Design" },
  { value: "FULL_LOOP", label: "Full Loop" },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "EN", label: "English" },
  { value: "PT_BR", label: "Portugues (BR)" },
];

export function InterviewConfig() {
  const {
    difficulty,
    interviewType,
    language,
    setDifficulty,
    setInterviewType,
    setLanguage,
    step,
  } = useSetupStore();
  const disabled = step !== "input" && step !== "error";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label>Difficulty</Label>
        <Select
          value={difficulty}
          onValueChange={(v) => setDifficulty(v as Difficulty)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Interview Type</Label>
        <Select
          value={interviewType}
          onValueChange={(v) => setInterviewType(v as InterviewType)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTERVIEW_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Language</Label>
        <Select
          value={language}
          onValueChange={(v) => setLanguage(v as Language)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
