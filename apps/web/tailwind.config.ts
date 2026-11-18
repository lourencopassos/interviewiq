import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Surfaces
        paper: "var(--paper)",
        "paper-2": "var(--paper-2)",
        sheet: "var(--sheet)",
        // Ink
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        // Lines
        line: "var(--line)",
        "line-soft": "var(--line-soft)",
        "line-strong": "var(--line-strong)",
        // Pastel tiles (bg) with matching deep text colors
        sage: { DEFAULT: "var(--sage)", deep: "var(--sage-deep)" },
        butter: { DEFAULT: "var(--butter)", deep: "var(--butter-deep)" },
        peach: { DEFAULT: "var(--peach)", deep: "var(--peach-deep)" },
        lavender: { DEFAULT: "var(--lavender)", deep: "var(--lavender-deep)" },
        sky: { DEFAULT: "var(--sky)", deep: "var(--sky-deep)" },
        blush: { DEFAULT: "var(--blush)", deep: "var(--blush-deep)" },
        rust: "var(--rust)",

        // shadcn compatibility layer, mapped onto the paper system
        border: "var(--line)",
        input: "var(--line-strong)",
        ring: "var(--ink)",
        background: "var(--paper)",
        foreground: "var(--ink)",
        primary: {
          DEFAULT: "var(--ink)",
          foreground: "var(--paper)",
        },
        secondary: {
          DEFAULT: "var(--sheet)",
          foreground: "var(--ink)",
        },
        destructive: {
          DEFAULT: "var(--rust)",
          foreground: "#fff",
        },
        muted: {
          DEFAULT: "var(--paper-2)",
          foreground: "var(--muted)",
        },
        accent: {
          DEFAULT: "var(--sage)",
          foreground: "var(--sage-deep)",
        },
        popover: {
          DEFAULT: "var(--card)",
          foreground: "var(--ink)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--ink)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 6px)",
        tile: "var(--radius)",
      },
      borderWidth: {
        "1.5": "1.5px",
      },
      boxShadow: {
        pop: "2px 3px 0 var(--drop)",
        "pop-sm": "1.5px 2px 0 var(--drop)",
        "pop-lg": "4px 6px 0 var(--drop)",
        "pop-none": "0 0 0 var(--drop)",
        card: "var(--card-shadow)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.6)",
      },
      transitionTimingFunction: {
        pop: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.85) translateY(4px)" },
          "60%": { opacity: "1", transform: "scale(1.04) translateY(0)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "wave-bar": {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
        caret: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "dash-flow": {
          to: { strokeDashoffset: "-24" },
        },
        "ring-pulse": {
          "0%": { boxShadow: "0 0 0 0 var(--pulse-color, rgba(208,104,58,0.45))" },
          "100%": { boxShadow: "0 0 0 14px rgba(208,104,58,0)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "avatar-speaking": {
          "0%, 100%": { transform: "scale(1)" },
          "25%": { transform: "scale(1.04)" },
          "50%": { transform: "scale(1.02)" },
          "75%": { transform: "scale(1.05)" },
        },
        "avatar-idle": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.01)", opacity: "0.95" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "pop-in": "pop-in 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "wave-bar": "wave-bar 0.9s ease-in-out infinite",
        caret: "caret 1s steps(1) infinite",
        "dash-flow": "dash-flow 1.2s linear infinite",
        "ring-pulse": "ring-pulse 1.4s ease-out infinite",
        "float-slow": "float-slow 5s ease-in-out infinite",
        "avatar-speaking": "avatar-speaking 0.6s ease-in-out infinite",
        "avatar-idle": "avatar-idle 3s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
