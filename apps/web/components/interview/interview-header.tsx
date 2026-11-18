"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface InterviewHeaderProps {
  companyName: string;
  jobTitle: string;
  difficulty: string;
  questionOrder: number;
  questionTotal: number;
}

export function InterviewHeader({
  companyName,
  jobTitle,
  difficulty,
  questionOrder,
  questionTotal,
}: InterviewHeaderProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const difficultyColor: Record<string, string> = {
    JUNIOR: "bg-green-500/20 text-green-400 border-green-500/30",
    MID: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    SENIOR: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    STAFF: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{companyName}</h1>
        <p className="text-sm text-muted-foreground">{jobTitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <Badge
          variant="outline"
          className={difficultyColor[difficulty] || ""}
        >
          {difficulty}
        </Badge>

        <span className="text-sm font-mono text-muted-foreground">
          {timeStr}
        </span>

        <span className="text-sm text-muted-foreground">
          {questionOrder}/{questionTotal}
        </span>
      </div>
    </div>
  );
}
