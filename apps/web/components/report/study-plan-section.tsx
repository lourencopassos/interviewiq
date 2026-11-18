"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudyPlanItem } from "@interviewiq/types";
import { interpolate, useI18n } from "@/lib/i18n";

interface StudyPlanSectionProps {
  studyPlan: StudyPlanItem[];
}

const resourceTone: Record<StudyPlanItem["resources"][number]["type"], string> = {
  book: "bg-sky text-sky-deep",
  course: "bg-lavender text-lavender-deep",
  practice: "bg-sage text-sage-deep",
  article: "bg-butter text-butter-deep",
};

function StudyPlanCard({ item, index }: { item: StudyPlanItem; index: number }) {
  const { t } = useI18n();
  const copy = t.report.studyPlan;
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `study-plan-${index}`;

  return (
    <div className="tile overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-sheet"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-1.5 border-ink bg-ink text-[12px] font-bold tabular-nums text-paper">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="truncate font-semibold text-ink">{item.topic}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="pill bg-card tabular-nums">
            {interpolate(copy.hours, { n: item.estimatedHours })}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </button>

      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-pop",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-line p-4">
            <div>
              <p className="eyebrow">{copy.whyItMatters}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{item.whyItMatters}</p>
            </div>

            {item.resources.length > 0 && (
              <div>
                <p className="eyebrow mb-2">{copy.resources}</p>
                <div className="flex flex-wrap gap-2">
                  {item.resources.map((r, i) => {
                    const pillClass = cn(
                      "pill gap-2 bg-card py-1 font-medium",
                      r.url &&
                        "transition-[transform,box-shadow] duration-150 ease-pop hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-sm",
                    );
                    const body = (
                      <>
                        <span className={cn("rounded-[4px] px-1 py-px", resourceTone[r.type])}>
                          <span className="eyebrow text-[9px] text-current">
                            {copy.resourceType[r.type] ?? r.type}
                          </span>
                        </span>
                        <span className="text-ink">{r.title}</span>
                        {r.url && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                      </>
                    );
                    return r.url ? (
                      <a
                        key={i}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={pillClass}
                      >
                        {body}
                      </a>
                    ) : (
                      <span key={i} className={pillClass}>
                        {body}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-md border-1.5 border-ink bg-lavender p-3 text-lavender-deep">
              <p className="eyebrow text-current opacity-80">{copy.practicePrompt}</p>
              <p className="mt-1 text-[13px] leading-relaxed">&ldquo;{item.practicePrompt}&rdquo;</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudyPlanSection({ studyPlan }: StudyPlanSectionProps) {
  const { t } = useI18n();
  const copy = t.report.studyPlan;
  if (studyPlan.length === 0) return null;

  const totalHours = studyPlan.reduce((sum, item) => sum + item.estimatedHours, 0);

  return (
    <section aria-label={copy.sectionLabel}>
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">
          <span className="text-ink">[ {copy.eyebrow} ]</span> {copy.tagline}
        </p>
        <span className="pill bg-lavender text-lavender-deep tabular-nums">
          {interpolate(copy.totalHours, { n: totalHours })}
        </span>
      </div>
      <div className="space-y-3">
        {studyPlan.map((item, i) => (
          <StudyPlanCard key={i} item={item} index={i} />
        ))}
      </div>
    </section>
  );
}
