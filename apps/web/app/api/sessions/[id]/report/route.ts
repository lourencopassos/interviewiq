import { NextResponse } from "next/server";
import { prisma } from "@interviewiq/db";
import {
  getOrCreateOrchestrator,
  getReportPayload,
  type ReportPayload,
} from "@interviewiq/ai";
import { withMockMode } from "@/lib/with-mock-mode";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { errorResponse, jsonError } from "@/lib/api-response";
import { assertOwner } from "@/lib/session-owner";

function toResponse(payload: ReportPayload) {
  switch (payload.kind) {
    case "not_found":
      return jsonError(404, "NOT_FOUND", "Session not found");
    case "not_ready":
      return jsonError(202, "NOT_READY", "Report not yet generated", { status: payload.status });
    case "ready":
      return NextResponse.json({
        report: payload.report,
        session: payload.session,
        questions: payload.questions,
      });
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
    console.error("Report fetch failed:", error);
    return jsonError(500, "FAILED", "Failed to fetch report");
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

    const session = await prisma.session.findUnique({
      where: { id },
      select: { status: true, report: { select: { id: true } } },
    });
    if (!session) {
      return jsonError(404, "NOT_FOUND", "Session not found");
    }
    if (session.report) {
      return toResponse(await getReportPayload(id));
    }
    if (session.status !== "WRAPPING_UP" && session.status !== "COMPLETED") {
      return jsonError(409, "NOT_FINISHED", `Interview is ${session.status}; finish it before generating a report`);
    }

    try {
      await getOrCreateOrchestrator(id).generateReport();
      return toResponse(await getReportPayload(id));
    } catch (error) {
      console.error("Report regeneration failed:", error);
      return errorResponse(error, {
        status: 500,
        code: "FAILED",
        error: "Report generation failed. Please try again.",
      });
    }
  });
}
