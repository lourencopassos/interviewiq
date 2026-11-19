"use client";

import { useEffect, useRef } from "react";
import { useSetupStore } from "@/lib/stores/setup-store";
import { useI18n, interpolate, defaultInterviewLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { QUESTION_COUNT, type Difficulty, type InterviewType, type Language } from "@interviewiq/types";

interface Option<T extends string> {
  value: T;
  label: string;
  /** Tiny second line: what picking this changes. */
  meta?: string;
}

/** Store default; the UI-locale default only applies while this is untouched. */
const INITIAL_LANGUAGE: Language = "EN";

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

export function InterviewConfig({ disabled }: { disabled: boolean }) {
  const { t, locale } = useI18n();
  const {
    difficulty,
    interviewType,
    language,
    setDifficulty,
    setInterviewType,
    setLanguage,
  } = useSetupStore();

  // Once per mount: if the user hasn't picked a language yet, follow the UI
  // locale. The ref keeps this from ever running again (and overriding a choice).
  const defaultedLanguage = useRef(false);
  useEffect(() => {
    if (defaultedLanguage.current) return;
    defaultedLanguage.current = true;
    if (language !== INITIAL_LANGUAGE) return;
    const preferred = defaultInterviewLanguage(locale);
    if (preferred !== language) setLanguage(preferred);
  }, [locale, language, setLanguage]);

  const difficultyOptions: Option<Difficulty>[] = (
    ["JUNIOR", "MID", "SENIOR", "STAFF"] as const
  ).map((value) => ({
    value,
    label: t.common.difficulty[value],
    meta: interpolate(t.setup.configure.questions, { count: QUESTION_COUNT[value] }),
  }));

  const interviewTypeOptions: Option<InterviewType>[] = (
    ["PHONE_SCREEN", "TECHNICAL", "BEHAVIORAL", "SYSTEM_DESIGN", "FULL_LOOP"] as const
  ).map((value) => ({
    value,
    label: t.common.interviewType[value],
    meta: t.setup.configure.typeMeta[value],
  }));

  const languageOptions: Option<Language>[] = [
    { value: "EN", label: t.common.interviewLanguage.EN, meta: "EN" },
    { value: "PT_BR", label: t.common.interviewLanguage.PT_BR, meta: "PT-BR" },
    { value: "ES", label: t.common.interviewLanguage.ES, meta: "ES" },
  ];

  return (
    <div className="space-y-5">
      <OptionTiles
        label={t.setup.configure.difficulty}
        options={difficultyOptions}
        value={difficulty}
        onChange={setDifficulty}
        disabled={disabled}
        className="grid-cols-2 md:grid-cols-4"
      />

      <OptionTiles
        label={t.setup.configure.interviewType}
        options={interviewTypeOptions}
        value={interviewType}
        onChange={setInterviewType}
        disabled={disabled}
        className="grid-cols-2 sm:grid-cols-3"
      />

      <OptionTiles
        label={t.setup.configure.language}
        options={languageOptions}
        value={language}
        onChange={setLanguage}
        disabled={disabled}
        className="grid-cols-3"
      />
    </div>
  );
}
