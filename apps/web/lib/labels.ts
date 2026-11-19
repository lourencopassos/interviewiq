import type { Dictionary } from "@/lib/i18n";

/** Dictionary groups that map a server enum value to its display label. */
const GROUPS = {
  difficulty: (t: Dictionary) => t.common.difficulty,
  interviewType: (t: Dictionary) => t.common.interviewType,
  interviewLanguage: (t: Dictionary) => t.common.interviewLanguage,
  status: (t: Dictionary) => t.common.status,
  tier: (t: Dictionary) => t.common.tier,
  category: (t: Dictionary) => t.common.category,
} satisfies Record<string, (t: Dictionary) => Record<string, string>>;

export type LabelGroup = keyof typeof GROUPS;

/**
 * Display label for an enum-like value (`label(t, "difficulty", "MID")` → "Mid").
 * Values the dictionary doesn't know yet fall back to the value, de-snake-cased.
 */
export function label(t: Dictionary, group: LabelGroup, value: string): string {
  const labels: Record<string, string> = GROUPS[group](t);
  return labels[value] ?? value.replace(/_/g, " ");
}
