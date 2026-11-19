import { ensureReport, getReportPayload, type ReportPayload } from "@interviewiq/ai";
import { withMockMode } from "@/lib/with-mock-mode";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError, apiOk } from "@/lib/api-response";
import { assertOwner } from "@/lib/session-owner";

/** 200 with the report, 202 `{ status }` while it is still being generated, 404 for an unknown session. */
function toResponse(payload: ReportPayload) {
  switch (payload.kind) {
    case "not_found":
      return apiError("SESSION_NOT_FOUND");
    case "not_ready":
      return apiOk({ status: payload.status }, { status: 202 });
    case "ready":
      return apiOk({ report: payload.report, session: payload.session, questions: payload.questions });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const owner = await assertOwner(id, request);
  if (!owner.ok) return owner.response;

  try {
    return toResponse(await getReportPayload(id));
  } catch (error) {
    return apiError(error, { log: "Report fetch failed" });
  }
}

/**
 * (Re)generate the report for a finished interview. Idempotent: an existing
 * report is returned as-is.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withMockMode(async () => {
    const owner = await assertOwner(id, request);
    if (!owner.ok) return owner.response;

    const rl = checkRateLimit(`report:${id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    try {
      return toResponse(await ensureReport(id));
    } catch (error) {
      return apiError(error, { fallback: "REPORT_FAILED", log: "Report regeneration failed" });
    }
  });
}
