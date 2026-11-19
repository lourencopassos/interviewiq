"use client";

import { useEffect, useState } from "react";
import { Bookmark, Check, Trash2 } from "lucide-react";
import { draftKey, jobSchema, readJobs, saveJob, type SavedJob } from "@/lib/saved-jobs";
import { ResumeInput } from "./resume-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useSetupStore } from "@/lib/stores/setup-store";

const cvKey = "interviewiq.saved-cv";

export function SavedSetup() {
  const { t } = useI18n();
  const copy = t.setup.saved;
  const {
    storageError,
    jobDescription,
    parsedJob,
    companyIntel,
    resumeText,
    setResumeText,
    step,
    restoreJob,
  } = useSetupStore();
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [cv, setCv] = useState("");
  const [failed, setFailed] = useState(false);
  const busy = step === "parsing" || step === "researching";
  const current =
    step === "ready"
      ? jobs.find((job) => job.jobDescription === jobDescription)
      : undefined;
  const snapshot =
    step === "ready" && parsedJob
      ? jobSchema.parse({ jobDescription, parsedJob, companyIntel })
      : null;
  const saved =
    current &&
    JSON.stringify(jobSchema.parse(current)) === JSON.stringify(snapshot);

  function refresh() {
    try {
      setJobs(readJobs());
      setCv(localStorage.getItem(cvKey) ?? "");
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }

  useEffect(() => {
    const state = useSetupStore.getState();
    try {
      if (state.step === "input") {
        const draft = state.jobDescription || localStorage.getItem(draftKey);
        if (draft) state.setJobDescription(draft);
      }
    } catch {
      setFailed(true);
    }
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  // A completed analysis writes its snapshot before the store becomes ready.
  useEffect(refresh, [step, parsedJob]);

  function write(key: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      refresh();
    } catch {
      setFailed(true);
    }
  }

  return (
    <section
      className="tile p-5 lg:col-span-2"
      aria-labelledby="saved-setup-title"
    >
      <h2 id="saved-setup-title" className="flex items-center gap-2 text-lg">
        <Bookmark className="h-4 w-4" />
        {copy.title}
      </h2>
      <p className="mt-1 text-[12px] text-muted-foreground">{copy.hint}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="saved-job" className="eyebrow">
            {copy.jobs}
          </label>
          <div className="flex items-center gap-2">
            <Select
              value={current?.key ?? ""}
              disabled={busy || !jobs.length}
              onValueChange={(key) => {
                const job = jobs.find((entry) => entry.key === key);
                if (job) restoreJob(job);
              }}
            >
              <SelectTrigger id="saved-job">
                <SelectValue
                  placeholder={jobs.length ? copy.choose : copy.empty}
                >
                  {current &&
                    `${current.parsedJob.jobTitle} · ${current.parsedJob.companyName}`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {jobs.map(
                  ({ key, parsedJob: job, jobDescription: description }) => (
                    <SelectItem
                      key={key}
                      value={key}
                      textValue={job.jobTitle + " · " + job.companyName}
                    >
                      {job.jobTitle} · {job.companyName}
                      <span className="block max-w-xs truncate text-xs text-muted-foreground">
                        {description}
                      </span>
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            {current && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={copy.removeJob}
                title={copy.removeJob}
                onClick={() => write(current.key, null)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          {snapshot && (
            <Button
              variant="outline"
              size="sm"
              disabled={Boolean(saved)}
              onClick={() => {
                try {
                  saveJob(snapshot);
                  refresh();
                } catch {
                  setFailed(true);
                }
              }}
            >
              {saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              {saved ? copy.jobSaved : copy.saveJob}
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <ResumeInput />
          <div className="flex flex-wrap items-center gap-2">
            {cv && (
              <Button
                variant="outline"
                size="sm"
                disabled={resumeText === cv}
                onClick={() => setResumeText(cv)}
              >
                {resumeText === cv ? <Check className="h-4 w-4" /> : null}
                {resumeText === cv ? copy.cvInUse : copy.useCv}
              </Button>
            )}
            {(!cv || (resumeText.trim() && resumeText !== cv)) && (
              <Button
                variant="outline"
                size="sm"
                disabled={!resumeText.trim()}
                onClick={() => write(cvKey, resumeText)}
              >
                {cv ? copy.updateCv : copy.saveCv}
              </Button>
            )}
            {cv && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={copy.removeCv}
                title={copy.removeCv}
                onClick={() => write(cvKey, null)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      {(failed || storageError) && (
        <p role="alert" className="mt-3 text-sm text-rust">
          {copy.failed}
        </p>
      )}
    </section>
  );
}
