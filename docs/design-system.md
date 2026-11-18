# Design system

The UI borrows its voice from old schematics and terminal UIs: warm paper, one
monospace face, pastel tiles with an ink edge and a hard offset shadow. Light is
the default; a dark variant is a class on `<html>`.

## Tokens (CSS variables in `apps/web/app/globals.css`)

| Role | Light | Dark | Tailwind |
|---|---|---|---|
| Page background | `--paper` #f4ebe0 | #211e1a | `bg-paper` |
| Quiet surface | `--sheet` #f9f2e8 | #28241f | `bg-sheet`, `.sheet` |
| Tile fill | `--card` #f8f0e6 | #26231e | `bg-card`, `.tile` |
| Text | `--ink` #1d1b18 / `--ink-2` | #efe6d6 | `text-ink`, `text-ink-2` |
| Secondary text | `--muted` #6f6961 | #a3998b | `text-muted-foreground` |
| Lines | `--line`, `--line-soft`, `--line-strong` | | `border-line*` |
| Pastels | sage, butter, peach, lavender, sky, blush | darker fills, light text | `bg-sage text-sage-deep` … |
| Alert accent | `--rust` #d0683a | #d97a4f | `text-rust`, `bg-rust` |

Pastel meanings, used consistently:

- **sage** strong / success / go
- **butter** middling / caution / highlight
- **peach** the interviewer, speaking
- **lavender** system, report, follow-ups
- **sky** the candidate, info
- **blush** weak / error

## Type

JetBrains Mono for everything (`font-mono` is the default `font-sans` too).
Body 13px. Headings `font-extrabold tracking-tight`. Labels use `.eyebrow`:
11px, uppercase, 0.14em tracking. Numbers that align should be `tabular-nums`.

## Tile language (`@layer components`)

- `.tile` bordered paper tile with the soft card shadow
- `.tile-pop` + `.tile-pop-hover` + `.tile-pop-press` hard offset shadow, lifts on hover, drops on press
- `.sheet` quiet grouped surface
- `.pill` bordered chip; `.kbd` keyboard hint; `.led` status dot (`.led-live` pulses)
- `.connector` / `.connector-flow` dashed SVG line, animated dashes

Shadows: `shadow-pop-sm` (1.5/2px), `shadow-pop` (2/3px), `shadow-pop-lg` (4/6px).
Radius: `rounded-tile` (12px), `rounded-md` (8px).

## Components

`Button` variants: `default` (ink), `accent` (sage), `outline`, `secondary`,
`destructive` (blush), `ghost`, `link`. Sizes include `xl`.
`Card` takes `tone` (paper, sheet, sage, …), `pop`, `interactive`.
`Badge` variants are the pastel names plus `default`, `outline`, `secondary`.
`Alert` variants: `default` (sky), `destructive` (blush), `warning` (butter), `success` (sage).

## Motion

Keyframes in `tailwind.config.ts`: `fade-up`, `pop-in`, `wave-bar`, `caret`,
`dash-flow`, `ring-pulse`, `float-slow`. Use `<Reveal>` for scroll-in. Hover
lift and press are on the tile classes. Everything collapses under
`prefers-reduced-motion`.

Spend motion where it carries information: a score landing, a stage changing,
recording in progress. Don't animate decoration.
