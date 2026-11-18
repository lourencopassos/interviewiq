"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

interface NextTipsPanelProps {
  tips: string[];
}

export function NextTipsPanel({ tips }: NextTipsPanelProps) {
  if (tips.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-400" />
          Tips for Your Next Interview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="list-decimal space-y-2 pl-4">
          {tips.map((tip, i) => (
            <li key={i} className="text-sm">
              {tip}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
