/**
 * Which pastel a 0-100 score gets, everywhere in the UI (report, history card,
 * live transcript tile, Full Loop stage card) so a 74 looks the same on every
 * screen. These are tone bands only; the report's verdict wording is content
 * and is decided on the server.
 *
 *   >= 75  sage    strong
 *   >= 55  butter  middling
 *   <  55  blush   weak
 */
export type ScoreTone = "sage" | "butter" | "blush";

export const SCORE_BANDS = { strong: 75, middling: 55 } as const;

export function scoreTone(score: number): ScoreTone {
  if (score >= SCORE_BANDS.strong) return "sage";
  if (score >= SCORE_BANDS.middling) return "butter";
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

/** Pastel pill per question category, shared by the live question card and the report review. */
export const categoryTone: Record<string, "sky" | "peach" | "lavender" | "butter"> = {
  technical: "sky",
  behavioral: "peach",
  system_design: "lavender",
  culture_fit: "butter",
};
