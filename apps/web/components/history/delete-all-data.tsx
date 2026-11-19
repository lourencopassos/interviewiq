"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { clientHeaders } from "@/lib/client-id";
import { draftKey } from "@/lib/saved-jobs";
import { interpolate, useI18n } from "@/lib/i18n";

const CONFIRM_TIMEOUT_MS = 4000;
/** Browser-side copies of candidate data (see components/setup/saved-setup.tsx and lib/saved-jobs.ts). */
const SAVED_CV_KEY = "interviewiq.saved-cv";
const SAVED_JOB_PREFIX = "interviewiq.saved-job.";

function clearLocalData() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key === SAVED_CV_KEY || key === draftKey || key.startsWith(SAVED_JOB_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Storage unavailable (private mode): nothing stored there to clear.
  }
}

interface DeleteAllDataProps {
  /** Called after the server confirms the deletion. */
  onDeleted: () => void;
}

/** "Delete all my data": every session for this browser's client id plus local copies. */
export function DeleteAllData({ onDeleted }: DeleteAllDataProps) {
  const { t } = useI18n();
  const copy = t.history.deleteAll;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletedCount, setDeletedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const timeout = setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [confirming]);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", { method: "DELETE", headers: clientHeaders() });
      if (!res.ok) {
        setError(interpolate(copy.failed, { status: res.status }));
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { deleted?: number };
      clearLocalData();
      setDeletedCount(typeof data.deleted === "number" ? data.deleted : 0);
      onDeleted();
    } catch {
      setError(copy.network);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <section className="sheet flex flex-col gap-3 p-4" aria-labelledby="delete-all-heading">
      <p id="delete-all-heading" className="eyebrow">
        <span className="text-ink">[ {copy.eyebrow} ]</span>
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-[12px] text-ink-2">{copy.body}</p>
        <div className="flex shrink-0 gap-2">
          {confirming ? (
            <>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> {copy.deleting}
                  </>
                ) : (
                  copy.confirm
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={deleting}>
                {t.common.cancel}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setError(null);
                setDeletedCount(null);
                setConfirming(true);
              }}
            >
              <Trash2 className="h-3 w-3" />
              {copy.button}
            </Button>
          )}
        </div>
      </div>
      {deletedCount !== null && (
        <Alert variant="success" role="status">
          <Check className="h-4 w-4" />
          <AlertDescription>{interpolate(copy.done, { n: deletedCount })}</AlertDescription>
        </Alert>
      )}
      {error && (
        <p role="alert" className="text-[11px] text-rust">
          {error}
        </p>
      )}
    </section>
  );
}
