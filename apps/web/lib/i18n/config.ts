import type { Language } from "@interviewiq/types";

export const LOCALES = ["en", "pt", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "interviewiq-locale";

export const LOCALE_LABELS: Record<Locale, { short: string; native: string }> = {
  en: { short: "EN", native: "English" },
  pt: { short: "PT", native: "Português" },
  es: { short: "ES", native: "Español" },
};

/** BCP-47 tag for Intl formatting and <html lang>. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-US",
  pt: "pt-BR",
  es: "es",
};

/** Sensible default interview language when the UI is in a given locale. */
export function defaultInterviewLanguage(locale: Locale): Language {
  switch (locale) {
    case "pt":
      return "PT_BR";
    case "es":
      return "ES";
    default:
      return "EN";
  }
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Fill `{name}` placeholders in a dictionary string. */
export function interpolate(
  template: string,
  vars: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}
