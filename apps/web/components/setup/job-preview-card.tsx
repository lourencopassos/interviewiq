"use client";

import { X, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useSetupStore } from "@/lib/stores/setup-store";

export function JobPreviewCard() {
  const { parsedJob, companyIntel, step, clearAnalysis } = useSetupStore();

  if (step !== "ready" || !parsedJob) return null;

  const hasIntel =
    companyIntel &&
    (companyIntel.techStack.length > 0 ||
      companyIntel.engineeringCulture ||
      companyIntel.coachingTip);

  return (
    <Card className="animate-pop-in overflow-hidden">
      {/* Title strip */}
      <div className="flex items-center justify-between gap-3 border-b-1.5 border-ink bg-sheet px-4 py-2.5">
        <span className="inline-flex min-w-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
          <span className="led bg-sage-deep text-sage-deep/40" aria-hidden />
          <span className="truncate">parsed · {parsedJob.companyName}</span>
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="pill bg-butter capitalize text-butter-deep">
            {parsedJob.seniority}
          </span>
          <button
            type="button"
            onClick={clearAnalysis}
            title="Clear analysis and re-parse"
            aria-label="Clear analysis and re-parse"
            className="inline-flex h-6 w-6 items-center justify-center rounded-[5px] border-1.5 border-transparent text-muted-foreground transition-colors hover:border-ink hover:bg-blush hover:text-blush-deep"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <h3 className="text-xl leading-tight">{parsedJob.jobTitle}</h3>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {parsedJob.companyName} · <span className="capitalize">{parsedJob.domain}</span>
          </p>
        </div>

        {/* Skills */}
        <div>
          <p className="eyebrow mb-2">What they&apos;re hiring for</p>
          <div className="flex flex-wrap gap-1.5">
            {parsedJob.primarySkills.map((skill) => (
              <span key={skill} className="pill bg-sky text-sky-deep">
                {skill}
              </span>
            ))}
            {parsedJob.secondarySkills.map((skill) => (
              <span key={skill} className="pill border-line-strong bg-card text-ink-2">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Focus */}
        <div>
          <p className="eyebrow mb-2">Where the questions will go</p>
          <ul className="space-y-1 text-[13px] text-ink-2">
            {parsedJob.interviewFocus.slice(0, 3).map((topic, i) => (
              <li key={topic} className="flex gap-2">
                <span className="w-5 shrink-0 tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Company intelligence */}
        {hasIntel && (
          <div className="sheet space-y-4 p-4">
            <p className="eyebrow inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" aria-hidden />
              Company intel · web search
            </p>

            {companyIntel.techStack.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] text-muted-foreground">Tech stack</p>
                <div className="flex flex-wrap gap-1">
                  {companyIntel.techStack.map((tech) => (
                    <span key={tech} className="pill bg-lavender text-lavender-deep">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {companyIntel.engineeringCulture && (
              <div>
                <p className="mb-1 text-[11px] text-muted-foreground">Engineering culture</p>
                <p className="text-[13px] leading-relaxed text-ink-2">
                  {companyIntel.engineeringCulture}
                </p>
              </div>
            )}

            {companyIntel.coachingTip && (
              <div className="rounded-md border-1.5 border-ink bg-butter p-3 text-butter-deep shadow-pop-sm">
                <p className="eyebrow mb-1 text-butter-deep/80">Coaching tip</p>
                <p className="text-[13px] leading-relaxed">{companyIntel.coachingTip}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
