"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSetupStore } from "@/lib/stores/setup-store";

export function JobPreviewCard() {
  const { parsedJob, companyIntel, step, clearAnalysis } = useSetupStore();

  if (step !== "ready" || !parsedJob) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{parsedJob.jobTitle}</CardTitle>
            <CardDescription className="mt-1">
              {parsedJob.companyName}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {parsedJob.seniority}
            </Badge>
            <button
              onClick={clearAnalysis}
              className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Clear analysis and re-parse"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Skills */}
        <div>
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">
            Key Skills
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {parsedJob.primarySkills.map((skill) => (
              <Badge key={skill} variant="default">
                {skill}
              </Badge>
            ))}
            {parsedJob.secondarySkills.map((skill) => (
              <Badge key={skill} variant="outline">
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        {/* Domain & Focus */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="mb-1 text-sm font-medium text-muted-foreground">
              Domain
            </h4>
            <p className="text-sm capitalize">{parsedJob.domain}</p>
          </div>
          <div>
            <h4 className="mb-1 text-sm font-medium text-muted-foreground">
              Interview Focus
            </h4>
            <ul className="space-y-0.5 text-sm">
              {parsedJob.interviewFocus.slice(0, 3).map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Company Intelligence */}
        {companyIntel && (companyIntel.techStack.length > 0 || companyIntel.engineeringCulture || companyIntel.coachingTip) && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Company Intelligence</h4>

              {companyIntel.techStack.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Tech Stack
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {companyIntel.techStack.map((tech) => (
                      <Badge key={tech} variant="outline" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {companyIntel.engineeringCulture && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Engineering Culture
                  </span>
                  <p className="mt-0.5 text-sm">
                    {companyIntel.engineeringCulture}
                  </p>
                </div>
              )}

              {companyIntel.coachingTip && (
                <div className="rounded-md bg-secondary/50 p-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    Coaching Tip
                  </span>
                  <p className="mt-0.5 text-sm">{companyIntel.coachingTip}</p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
