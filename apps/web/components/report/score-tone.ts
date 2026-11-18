/**
 * One place for "which pastel does this score get". Used by the report and
 * the history cards so a 74 looks the same everywhere.
 *
 *   >= 75  sage    strong
 *   >= 55  butter  middling
 *   <  55  blush   weak
 */
export type ScoreTone = "sage" | "butter" | "blush";

export function scoreTone(score: number): ScoreTone {
  if (score >= 75) return "sage";
  if (score >= 55) return "butter";
  return "blush";
}

export const toneStyles: Record<
  ScoreTone,
  {
    /** Pastel fill + deep text, for tiles and pills. */
    tile: string;
    /** Deep text only. */
    text: string;
    /** SVG stroke in the deep tone. */
    stroke: string;
    /** CSS variable for the pastel fill (inline styles that must survive print). */
    fillVar: string;
  }
> = {
  sage: {
    tile: "bg-sage text-sage-deep",
    text: "text-sage-deep",
    stroke: "stroke-sage-deep",
    fillVar: "var(--sage)",
  },
  butter: {
    tile: "bg-butter text-butter-deep",
    text: "text-butter-deep",
    stroke: "stroke-butter-deep",
    fillVar: "var(--butter)",
  },
  blush: {
    tile: "bg-blush text-blush-deep",
    text: "text-blush-deep",
    stroke: "stroke-blush-deep",
    fillVar: "var(--blush)",
  },
};
