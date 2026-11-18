import Link from "next/link";
import { FileText, Mic, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Paste Job Description",
    description:
      "AI parses the role, skills, and researches the company using real-time web search.",
  },
  {
    icon: Mic,
    title: "Interview with AI",
    description:
      "Adaptive voice interview tailored to the role, company, and your difficulty level.",
  },
  {
    icon: BarChart3,
    title: "Get Coached",
    description:
      "Detailed coaching report with scores, study plan, and actionable tips.",
  },
];

const sampleScores = [
  { label: "Technical", score: 78 },
  { label: "Problem Solving", score: 72 },
  { label: "Communication", score: 85 },
  { label: "Behavioral", score: 80 },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-8 px-8 py-24 text-center">
        <div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            InterviewIQ
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            AI-powered mock interviews with real company intelligence.
            Practice for any role, get scored, and receive a personalized coaching report.
          </p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/new"
            className="rounded-lg bg-primary px-8 py-3 text-lg font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start Interview
          </Link>
          <Link
            href="/history"
            className="rounded-lg border border-border px-8 py-3 text-lg font-medium transition-colors hover:bg-muted"
          >
            View History
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="w-full border-t border-border px-8 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-2xl font-bold">How It Works</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="mb-1 font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Report Preview */}
      <section className="w-full border-t border-border px-8 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Sample Coaching Report
          </h2>
          <div className="rounded-lg border border-border bg-card p-6 space-y-6">
            {/* Mock verdict */}
            <div className="rounded-lg bg-green-600/10 border border-green-500/20 p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Overall Result
              </p>
              <p className="text-2xl font-bold text-green-400">Lean Pass</p>
              <p className="text-lg font-semibold text-green-400">74/100</p>
            </div>

            {/* Mock scores */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {sampleScores.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-bold">{s.score}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Every report includes strengths, areas to improve, a prioritized study plan with resources, and tactical interview tips.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-border px-8 py-8 text-center text-sm text-muted-foreground">
        InterviewIQ — AI-Powered Recruitment Coach
      </footer>
    </div>
  );
}
