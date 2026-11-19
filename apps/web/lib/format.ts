import { LOCALE_TAGS, type Locale } from "@/lib/i18n";

/** "Mar 4, 2026" in the interface language. */
export function formatDate(locale: Locale, date: Date | string): string {
  return new Date(date).toLocaleDateString(LOCALE_TAGS[locale], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Elapsed seconds as `m:ss`, or `mm:ss` with `padMinutes`. */
export function formatDuration(totalSeconds: number, { padMinutes = false } = {}): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = String(Math.floor(seconds / 60));
  const rest = String(seconds % 60).padStart(2, "0");
  return `${padMinutes ? minutes.padStart(2, "0") : minutes}:${rest}`;
}
