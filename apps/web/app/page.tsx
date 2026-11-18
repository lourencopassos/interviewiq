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
import { cn } from "@/lib/utils";

// The flow is a real sequence, so the numbering carries information.
const steps = [
  {
    n: "01",
    icon: ClipboardPaste,
    title: "Paste the posting",
    body: "The role, the stack and the seniority are pulled out of the text. Then the interviewer reads up on the company: culture, process, recent news.",
    tone: "bg-sky text-sky-deep",
    meta: "~40s",
  },
  {
    n: "02",
    icon: Mic,
    title: "Talk it through",
    body: "Questions are spoken aloud. You answer with your voice. Each answer is scored on the spot, and a weak one earns a follow-up instead of a free pass.",
    tone: "bg-peach text-peach-deep",
    meta: "15–25 min",
  },
  {
    n: "03",
    icon: FileBarChart,
    title: "Read the debrief",
    body: "A verdict, four dimension scores, what landed, what didn't, and a study plan ordered by what would move your score most.",
    tone: "bg-lavender text-lavender-deep",
    meta: "yours to keep",
  },
] as const;

const rules = [
  {
    icon: CornerDownRight,
    label: "score < 65",
    title: "Follow-up",
    body: "The interviewer asks a second question on the same topic before moving on.",
    tone: "bg-blush text-blush-deep",
  },
  {
    icon: FastForward,
    label: "score > 88",
    title: "Skip ahead",
    body: "An easy question next in line gets dropped. Strong answers buy harder ones.",
    tone: "bg-sage text-sage-deep",
  },
  {
    icon: Layers,
    label: "full loop",
    title: "Four stages",
    body: "Phone screen, technical, behavioral, system design, with spoken transitions between them.",
    tone: "bg-butter text-butter-deep",
  },
  {
    icon: Globe,
    label: "web search",
    title: "Knows the company",
    body: "Questions reference the real stack and culture, not a generic template.",
    tone: "bg-sky text-sky-deep",
  },
] as const;

const sample = {
  verdict: "Lean Pass",
  score: 74,
  dims: [
    { label: "Technical", score: 78, tone: "bg-sage" },
    { label: "Problem solving", score: 72, tone: "bg-butter" },
    { label: "Communication", score: 85, tone: "bg-sage" },
    { label: "Behavioral", score: 80, tone: "bg-sage" },
  ],
};

export default function Home() {
  return (
    <div className="pb-24">
      {/* ------------------------------------------------------------ */}
      {/* Hero                                                          */}
      {/* ------------------------------------------------------------ */}
      <section className="container grid items-center gap-10 pb-16 pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-20">
        <div className="max-w-xl">
          <p className="eyebrow animate-fade-up">
            <span className="text-ink">[ 01 ]</span> practice · score · study
          </p>
          <h1
            className="mt-4 text-balance text-4xl leading-[1.05] sm:text-5xl lg:text-[3.4rem] animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            Interview like it&apos;s the real one.
            <br />
            Then read{" "}
            <mark className="rounded-sm bg-butter px-1 text-ink [box-decoration-break:clone]">
              the debrief.
            </mark>
          </h1>
          <p
            className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-2 animate-fade-up"
            style={{ animationDelay: "160ms" }}
          >
            Paste a job description. An interviewer who has researched the company asks
            you questions out loud, scores every answer, and digs in when you&apos;re vague.
            You leave with a report and a study plan.
          </p>

          <div
            className="mt-8 flex flex-wrap items-center gap-3 animate-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            <Button asChild variant="accent" size="xl">
              <Link href="/new">
                Start an interview <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href="/history">Past sessions</Link>
            </Button>
          </div>

          <dl
            className="mt-10 grid grid-cols-3 gap-3 text-[11px] animate-fade-up"
            style={{ animationDelay: "320ms" }}
          >
            {[
              ["Runs on", "your machine"],
              ["Voices", "Claude · Whisper · ElevenLabs"],
              ["Languages", "EN · PT-BR"],
            ].map(([k, v]) => (
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
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            A scripted preview. Real sessions run on your keys.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* How it works                                                  */}
      {/* ------------------------------------------------------------ */}
      <section className="container pt-10">
        <Reveal className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">
              <span className="text-ink">[ 02 ]</span> how a session runs
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl">Three steps, one sitting.</h2>
          </div>
          <span className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex">
            <span className="kbd">Space</span> record
            <span className="kbd ml-2">R</span> replay the question
          </span>
        </Reveal>

        <div className="relative grid gap-5 md:grid-cols-3">
          {/* Schematic connector behind the tiles */}
          <svg
            aria-hidden
            className="pointer-events-none absolute left-0 top-10 hidden h-2 w-full md:block"
            viewBox="0 0 100 2"
            preserveAspectRatio="none"
          >
            <line x1="16" y1="1" x2="84" y2="1" className="connector connector-flow" vectorEffect="non-scaling-stroke" />
          </svg>

          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 90}>
              <article className="tile-pop tile-pop-hover relative h-full p-5">
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md border-1.5 border-ink shadow-pop-sm",
                      step.tone,
                    )}
                  >
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="pill bg-card">{step.meta}</span>
                </div>
                <p className="eyebrow mt-5">
                  step <span className="text-ink">{step.n}</span>
                </p>
                <h3 className="mt-1 text-lg">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{step.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Rules of the room                                             */}
      {/* ------------------------------------------------------------ */}
      <section className="container pt-20">
        <Reveal className="mb-8">
          <p className="eyebrow">
            <span className="text-ink">[ 03 ]</span> what the interviewer adapts
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl">It listens to how you&apos;re doing.</h2>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rules.map((r, i) => (
            <Reveal key={r.title} delay={i * 70}>
              <div className={cn("tile-pop tile-pop-hover h-full p-4", r.tone)}>
                <div className="flex items-center justify-between">
                  <r.icon className="h-5 w-5" />
                  <span className="rounded-[5px] border border-current/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                    {r.label}
                  </span>
                </div>
                <h3 className="mt-5 text-base">{r.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed opacity-90">{r.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Sample report                                                 */}
      {/* ------------------------------------------------------------ */}
      <section className="container pt-20">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <p className="eyebrow">
              <span className="text-ink">[ 04 ]</span> the debrief
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl">A report you can actually act on.</h2>
            <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-ink-2">
              Every session ends with a verdict and four dimension scores, then the parts
              that matter: what you did well, what to fix first, a study plan with real
              resources, and a per-question review with your transcript next to the
              interviewer&apos;s notes.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Strengths", "Areas to improve", "Study plan", "Question review", "Retake readiness"].map((t) => (
                <span key={t} className="pill bg-card">
                  {t}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="tile overflow-hidden">
              <div className="flex items-center justify-between border-b-1.5 border-ink bg-sheet px-4 py-2.5">
                <span className="eyebrow text-ink-2">Coaching report · sample</span>
                <span className="pill bg-sage text-sage-deep">{sample.verdict}</span>
              </div>
              <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr]">
                <div className="flex flex-col items-center justify-center rounded-md border-1.5 border-ink bg-butter px-6 py-4 text-butter-deep shadow-pop-sm">
                  <span className="text-4xl font-extrabold tabular-nums">{sample.score}</span>
                  <span className="eyebrow text-butter-deep/80">overall</span>
                </div>
                <ul className="space-y-3">
                  {sample.dims.map((d) => (
                    <li key={d.label}>
                      <div className="mb-1 flex items-center justify-between text-[12px]">
                        <span className="font-semibold">{d.label}</span>
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
                <span className="eyebrow mr-2 text-ink">Fix first</span>
                Accessibility in virtualized lists · 3h · one practice prompt included
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
              <p className="eyebrow text-paper/60">ready when you are</p>
              <h2 className="mt-2 text-2xl text-paper sm:text-3xl">Your next interview is a paste away.</h2>
            </div>
            <Button asChild variant="accent" size="xl" className="shrink-0">
              <Link href="/new">
                Start an interview <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>

      <footer className="container mt-16 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 text-[11px] text-muted-foreground sm:flex-row sm:items-center">
        <span>
          InterviewIQ · MIT licensed · self-hosted, bring your own API keys
        </span>
        <a
          href="https://github.com/lourencopassos/interviewq"
          className="inline-flex items-center gap-1.5 font-semibold text-ink-2 underline decoration-line-strong underline-offset-4 hover:decoration-ink"
          target="_blank"
          rel="noreferrer"
        >
          <Github className="h-3.5 w-3.5" /> Source on GitHub
        </a>
      </footer>
    </div>
  );
}
