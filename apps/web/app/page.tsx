"use client";

import Link from "next/link";
import {
  ArrowRight,
  ClipboardPaste,
  Mic,
  FileBarChart,
  CornerDownRight,
  FastForward,
  Layers,
  Globe,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { InterviewDemo } from "@/components/landing/interview-demo";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Presentation per step / rule; the copy lives in the dictionary (same order).
const STEP_STYLE = [
  { n: "01", icon: ClipboardPaste, tone: "bg-sky text-sky-deep" },
  { n: "02", icon: Mic, tone: "bg-peach text-peach-deep" },
  { n: "03", icon: FileBarChart, tone: "bg-lavender text-lavender-deep" },
] as const;

const RULE_STYLE = [
  { icon: CornerDownRight, tone: "bg-blush text-blush-deep" },
  { icon: FastForward, tone: "bg-sage text-sage-deep" },
  { icon: Layers, tone: "bg-butter text-butter-deep" },
  { icon: Globe, tone: "bg-sky text-sky-deep" },
] as const;

const SAMPLE_SCORE = 74;
const SAMPLE_DIMS = [
  { score: 78, tone: "bg-sage" },
  { score: 72, tone: "bg-butter" },
  { score: 85, tone: "bg-sage" },
  { score: 80, tone: "bg-sage" },
] as const;

export default function Home() {
  const { t } = useI18n();
  const L = t.landing;

  return (
    <div className="pb-24">
      {/* ------------------------------------------------------------ */}
      {/* Hero                                                          */}
      {/* ------------------------------------------------------------ */}
      <section className="container grid items-center gap-10 pb-16 pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-20">
        <div className="max-w-xl">
          <p className="eyebrow animate-fade-up">
            <span className="text-ink">[ 01 ]</span> {L.hero.eyebrow}
          </p>
          <h1
            className="mt-4 text-balance text-4xl leading-[1.05] sm:text-5xl lg:text-[3.4rem] animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            {L.hero.titleA}
            <br />
            {L.hero.titleB}{" "}
            <mark className="rounded-sm bg-butter px-1 text-ink [box-decoration-break:clone]">
              {L.hero.titleMark}
            </mark>
          </h1>
          <p
            className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-2 animate-fade-up"
            style={{ animationDelay: "160ms" }}
          >
            {L.hero.body}
          </p>

          <div
            className="mt-8 flex flex-wrap items-center gap-3 animate-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            <Button asChild variant="accent" size="xl">
              <Link href="/new">
                {L.hero.start} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href="/history">{L.hero.history}</Link>
            </Button>
          </div>

          <dl
            className="mt-10 grid grid-cols-3 gap-3 text-[11px] animate-fade-up"
            style={{ animationDelay: "320ms" }}
          >
            {L.hero.facts.map(([k, v]) => (
              <div key={k} className="sheet px-3 py-2">
                <dt className="eyebrow">{k}</dt>
                <dd className="mt-0.5 font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative animate-fade-up" style={{ animationDelay: "200ms" }}>
          <div
            aria-hidden
            className="absolute -inset-x-6 -top-6 bottom-10 -z-10 rounded-[20px] border-1.5 border-dashed border-line-strong"
          />
          <InterviewDemo className="animate-float-slow" />
          <p className="mt-3 text-center text-[11px] text-muted-foreground">{L.hero.demoCaption}</p>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* How it works                                                  */}
      {/* ------------------------------------------------------------ */}
      <section className="container pt-10">
        <Reveal className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">
              <span className="text-ink">[ 02 ]</span> {L.steps.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl">{L.steps.title}</h2>
          </div>
          <span className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex">
            <span className="kbd">Space</span> {L.steps.hintRecord}
            <span className="kbd ml-2">R</span> {L.steps.hintReplay}
          </span>
        </Reveal>

        <div className="relative grid gap-5 md:grid-cols-3">
          <svg
            aria-hidden
            className="pointer-events-none absolute left-0 top-10 hidden h-2 w-full md:block"
            viewBox="0 0 100 2"
            preserveAspectRatio="none"
          >
            <line x1="16" y1="1" x2="84" y2="1" className="connector connector-flow" vectorEffect="non-scaling-stroke" />
          </svg>

          {L.steps.items.map((step, i) => {
            const style = STEP_STYLE[i];
            return (
              <Reveal key={style.n} delay={i * 90}>
                <article className="tile-pop tile-pop-hover relative h-full p-5">
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-md border-1.5 border-ink shadow-pop-sm",
                        style.tone,
                      )}
                    >
                      <style.icon className="h-5 w-5" />
                    </span>
                    <span className="pill bg-card">{step.meta}</span>
                  </div>
                  <p className="eyebrow mt-5">
                    {L.steps.stepLabel} <span className="text-ink">{style.n}</span>
                  </p>
                  <h3 className="mt-1 text-lg">{step.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{step.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Rules of the room                                             */}
      {/* ------------------------------------------------------------ */}
      <section className="container pt-20">
        <Reveal className="mb-8">
          <p className="eyebrow">
            <span className="text-ink">[ 03 ]</span> {L.rules.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl">{L.rules.title}</h2>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {L.rules.items.map((r, i) => {
            const style = RULE_STYLE[i];
            return (
              <Reveal key={r.title} delay={i * 70}>
                <div className={cn("tile-pop tile-pop-hover h-full p-4", style.tone)}>
                  <div className="flex items-center justify-between">
                    <style.icon className="h-5 w-5" />
                    <span className="rounded-[5px] border border-current/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                      {r.label}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base">{r.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed opacity-90">{r.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Sample report                                                 */}
      {/* ------------------------------------------------------------ */}
      <section className="container pt-20">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <p className="eyebrow">
              <span className="text-ink">[ 04 ]</span> {L.report.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl">{L.report.title}</h2>
            <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-ink-2">{L.report.body}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {L.report.chips.map((c) => (
                <span key={c} className="pill bg-card">
                  {c}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="tile overflow-hidden">
              <div className="flex items-center justify-between border-b-1.5 border-ink bg-sheet px-4 py-2.5">
                <span className="eyebrow text-ink-2">{L.report.sampleLabel}</span>
                <span className="pill bg-sage text-sage-deep">{L.report.verdict}</span>
              </div>
              <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr]">
                <div className="flex flex-col items-center justify-center rounded-md border-1.5 border-ink bg-butter px-6 py-4 text-butter-deep shadow-pop-sm">
                  <span className="text-4xl font-extrabold tabular-nums">{SAMPLE_SCORE}</span>
                  <span className="eyebrow text-butter-deep/80">{L.report.overall}</span>
                </div>
                <ul className="space-y-3">
                  {SAMPLE_DIMS.map((d, i) => (
                    <li key={L.report.dims[i]}>
                      <div className="mb-1 flex items-center justify-between text-[12px]">
                        <span className="font-semibold">{L.report.dims[i]}</span>
                        <span className="tabular-nums text-muted-foreground">{d.score}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full border border-ink bg-paper-2">
                        <div
                          className={cn("h-full rounded-full border-r border-ink", d.tone)}
                          style={{ width: `${d.score}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-line bg-paper-2 px-5 py-3 text-[12px] text-ink-2">
                <span className="eyebrow mr-2 text-ink">{L.report.fixFirst}</span>
                {L.report.fixFirstBody}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* CTA + footer                                                  */}
      {/* ------------------------------------------------------------ */}
      <section className="container pt-20">
        <Reveal>
          <div className="tile-pop flex flex-col items-start justify-between gap-6 bg-ink p-6 text-paper sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="eyebrow text-paper/60">{L.cta.eyebrow}</p>
              <h2 className="mt-2 text-2xl text-paper sm:text-3xl">{L.cta.title}</h2>
            </div>
            <Button asChild variant="accent" size="xl" className="shrink-0">
              <Link href="/new">
                {L.cta.button} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>

      <footer className="container mt-16 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 text-[11px] text-muted-foreground sm:flex-row sm:items-center">
        <span>{L.footer.line}</span>
        <a
          href="https://github.com/lourencopassos/interviewq"
          className="inline-flex items-center gap-1.5 font-semibold text-ink-2 underline decoration-line-strong underline-offset-4 hover:decoration-ink"
          target="_blank"
          rel="noreferrer"
        >
          <Github className="h-3.5 w-3.5" /> {L.footer.source}
        </a>
      </footer>
    </div>
  );
}
