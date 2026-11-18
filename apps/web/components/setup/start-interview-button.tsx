"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSetupStore } from "@/lib/stores/setup-store";
import { getClientId } from "@/lib/client-id";

export function StartInterviewButton() {
  const router = useRouter();
  const {
    step,
    parsedJob,
    companyIntel,
    jobDescription,
    resumeText,
    difficulty,
    interviewType,
    language,
    videoMode,
  } = useSetupStore();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (step !== "ready" || !parsedJob) return null;

  const handleStart = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: getClientId(),
          jobTitle: parsedJob.jobTitle,
          companyName: parsedJob.companyName,
          jobDescription,
          difficulty,
          interviewType,
          language,
          videoMode,
          resumeText: resumeText || undefined,
          parsedJob: JSON.stringify(parsedJob),
          companyIntel: companyIntel ? JSON.stringify(companyIntel) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : `Failed to create session (${res.status})`,
        );
      }

      const session = await res.json();
      router.push(`/interview/${session.id}`);
    } catch (err) {
      console.error("Failed to start interview:", err);
      setError(
        err instanceof TypeError
          ? "Network error — please check your connection and try again"
          : err instanceof Error
            ? err.message
            : "Failed to create session",
      );
      setIsCreating(false);
    }
  };

  // A one-line readback of what's about to run, in the eyebrow voice.
  const summary = [
    difficulty,
    interviewType.replace(/_/g, " "),
    language.replace(/_/g, "-"),
    videoMode ? "video" : "audio",
    resumeText ? "with resume" : null,
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not start the interview</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="tile-pop bg-ink p-4 text-paper sm:p-5">
        <p className="eyebrow text-paper/60">
          ready · {summary.join(" · ")}
        </p>
        <h3 className="mt-1.5 text-lg text-paper">
          {parsedJob.jobTitle} at {parsedJob.companyName}
        </h3>
        <Button
          variant="accent"
          size="xl"
          onClick={handleStart}
          disabled={isCreating}
          className="mt-4 w-full"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating the session…
            </>
          ) : (
            <>
              {error ? "Try again" : "Start the interview"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
        <p className="mt-3 text-center text-[11px] text-paper/60">
          You&apos;ll be asked for microphone{videoMode ? " and camera" : ""} access on the next screen.
        </p>
      </div>
    </div>
  );
}
