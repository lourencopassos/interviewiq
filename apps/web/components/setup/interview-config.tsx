"use client";

import { useSetupStore } from "@/lib/stores/setup-store";
import { cn } from "@/lib/utils";
import type { Difficulty, InterviewType, Language } from "@interviewiq/types";

interface Option<T extends string> {
  value: T;
  label: string;
  /** Tiny second line: what picking this changes. */
  meta?: string;
}

const DIFFICULTY_OPTIONS: Option<Difficulty>[] = [
  { value: "JUNIOR", label: "Junior", meta: "5 questions" },
  { value: "MID", label: "Mid", meta: "6 questions" },
  { value: "SENIOR", label: "Senior", meta: "7 questions" },
  { value: "STAFF", label: "Staff", meta: "8 questions" },
];

const INTERVIEW_TYPE_OPTIONS: Option<InterviewType>[] = [
  { value: "PHONE_SCREEN", label: "Phone screen", meta: "warm-up round" },
  { value: "TECHNICAL", label: "Technical", meta: "deep dives" },
  { value: "BEHAVIORAL", label: "Behavioral", meta: "stories, STAR" },
  { value: "SYSTEM_DESIGN", label: "System design", meta: "architecture" },
  { value: "FULL_LOOP", label: "Full loop", meta: "4 stages" },
];

const LANGUAGE_OPTIONS: Option<Language>[] = [
  { value: "EN", label: "English", meta: "EN" },
  { value: "PT_BR", label: "Português", meta: "PT-BR" },
];

interface OptionTilesProps<T extends string> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}

/** Radio-style tile group. The selected tile goes sage. */
function OptionTiles<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  className,
}: OptionTilesProps<T>) {
  return (
    <div className="space-y-2">
      <p className="eyebrow">{label}</p>
      <div role="group" aria-label={label} className={cn("grid gap-2", className)}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "tile-pop tile-pop-hover tile-pop-press flex min-h-[3.25rem] flex-col items-start justify-center rounded-md px-3 py-2 text-left",
                "disabled:pointer-events-none disabled:opacity-50",
                selected ? "bg-sage text-sage-deep" : "bg-card text-ink",
              )}
            >
              <span className="text-[12px] font-bold uppercase tracking-[0.08em]">
                {opt.label}
              </span>
              {opt.meta && (
                <span
                  className={cn(
                    "mt-0.5 text-[10.5px] tabular-nums",
                    selected ? "text-sage-deep/80" : "text-muted-foreground",
                  )}
                >
                  {opt.meta}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
    <div className="space-y-5">
      <OptionTiles
        label="Difficulty"
        options={DIFFICULTY_OPTIONS}
        value={difficulty}
        onChange={setDifficulty}
        disabled={disabled}
        className="grid-cols-2 md:grid-cols-4"
      />

      <OptionTiles
        label="Interview type"
        options={INTERVIEW_TYPE_OPTIONS}
        value={interviewType}
        onChange={setInterviewType}
        disabled={disabled}
        className="grid-cols-2 sm:grid-cols-3"
      />

      <OptionTiles
        label="Language"
        options={LANGUAGE_OPTIONS}
        value={language}
        onChange={setLanguage}
        disabled={disabled}
        className="grid-cols-2"
      />
    </div>
  );
}
