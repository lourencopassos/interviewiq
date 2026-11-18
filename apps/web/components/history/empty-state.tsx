"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FilterX } from "lucide-react";

interface EmptyStateProps {
  /** When true, sessions exist but the active filters hide all of them. */
  filtered?: boolean;
  onClearFilters?: () => void;
}

export function EmptyState({ filtered = false, onClearFilters }: EmptyStateProps) {
  if (filtered) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">
            No sessions match these filters
          </p>
          <Button variant="outline" className="gap-2" onClick={onClearFilters}>
            <FilterX className="h-4 w-4" />
            Clear filters
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground mb-4">No interviews yet</p>
        <Link href="/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Start Your First Interview
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
