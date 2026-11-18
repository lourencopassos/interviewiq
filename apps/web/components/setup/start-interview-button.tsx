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

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not start interview</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        size="lg"
        onClick={handleStart}
        disabled={isCreating}
        className="w-full"
      >
        {isCreating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating session...
          </>
        ) : (
          <>
            {error ? "Try again" : "Start Interview"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
