import { NextResponse } from "next/server";
import { prisma } from "@interviewiq/db";
import {
  getOrCreateOrchestrator,
  getReportPayload,
  OrchestratorError,
  type ReportPayload,
} from "@interviewiq/ai";
import { withMockMode } from "@/lib/with-mock-mode";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

function toResponse(payload: ReportPayload) {
  switch (payload.kind) {
    case "not_found":
      return NextResponse.json({ error: "Session not found", code: "NOT_FOUND" }, { status: 404 });
    case "not_ready":
      return NextResponse.json(
        { error: "Report not yet generated", code: "NOT_READY", status: payload.status },
        { status: 202 },
      );
    case "ready":
      return NextResponse.json({
        report: payload.report,
        session: payload.session,
        questions: payload.questions,
      });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    return toResponse(await getReportPayload(id));
  } catch (error) {
    console.error("Report fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch report", code: "FAILED" }, { status: 500 });
  }
}

/**
 * (Re)generate the report for a finished interview. Idempotent: an existing
 * report is returned as-is.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withMockMode(async () => {
    const rl = checkRateLimit(`report:${id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const session = await prisma.session.findUnique({
      where: { id },
      select: { status: true, report: { select: { id: true } } },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found", code: "NOT_FOUND" }, { status: 404 });
    }
    if (session.report) {
      return toResponse(await getReportPayload(id));
    }
    if (session.status !== "WRAPPING_UP" && session.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Interview is ${session.status}; finish it before generating a report`, code: "NOT_FINISHED" },
        { status: 409 },
      );
    }

    try {
      await getOrCreateOrchestrator(id).generateReport();
      return toResponse(await getReportPayload(id));
    } catch (error) {
      console.error("Report regeneration failed:", error);
      if (error instanceof OrchestratorError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.httpStatus });
      }
      return NextResponse.json(
        { error: "Report generation failed. Please try again.", code: "FAILED", retryable: true },
        { status: 500 },
      );
    }
  });
}
