import { NextResponse } from "next/server";
import { assertOwner } from "@/lib/session-owner";
import { listCoachNotes, streamCoachAnswer, MissingApiKeyError, OrchestratorError, COACH_MODEL } from "@interviewiq/ai";
import { coachRequestSchema, type CoachStreamEvent } from "@interviewiq/types";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { errorResponse, jsonError } from "@/lib/api-response";
import { withMockMode } from "@/lib/with-mock-mode";

export const dynamic = "force-dynamic";

const COACH_FAILED_MESSAGE = "The coach is unavailable right now";
const encoder = new TextEncoder();
const line = (event: CoachStreamEvent) => encoder.encode(JSON.stringify(event) + "\n");

/** List this session's coach notes (used to restore the drawer after a refresh). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const owner = await assertOwner(id, request);
  if (!owner.ok) return owner.response;
  return NextResponse.json({ notes: await listCoachNotes(id), model: COACH_MODEL });
}

/**
 * Ask the coach about the current question. Streams NDJSON:
 *   {"type":"delta","text":"..."}  (many)
 *   {"type":"done","note":{...}}   (last)
 *   {"type":"error","code","message"}
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withMockMode(async () => {
    const owner = await assertOwner(id, request);
    if (!owner.ok) return owner.response;
    const rl = checkRateLimit(`coach:${id}`, { maxRequests: 12, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const parsed = coachRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(400, "INVALID_REQUEST", "Invalid request", { details: parsed.error.flatten() });
    }

    const cancellation = new AbortController();
    const signal = AbortSignal.any([request.signal, cancellation.signal]);
    const generator = streamCoachAnswer(id, parsed.data, signal);

    // Resolve the first chunk before committing to a 200 so validation errors
    // (no session, coach off, not interviewing) come back as proper statuses.
    let first: IteratorResult<string, Awaited<ReturnType<typeof listCoachNotes>>[number]>;
    try {
      first = await generator.next();
    } catch (error) {
      if (signal.aborted) return new Response(null, { status: 499 });
      if (!(error instanceof OrchestratorError)) console.error("Coach request failed:", error);
      return errorResponse(error, { status: 502, code: "COACH_FAILED", error: COACH_FAILED_MESSAGE });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let result = first;
          while (!result.done) {
            controller.enqueue(line({ type: "delta", text: result.value }));
            result = await generator.next();
          }
          controller.enqueue(line({ type: "done", note: result.value }));
        } catch (error) {
          if (signal.aborted) return;
          console.error("Coach stream failed:", error);
          // Fixed copy only; the provider's error text stays in the log above.
          controller.enqueue(
            line(
              error instanceof OrchestratorError || error instanceof MissingApiKeyError
                ? { type: "error", code: error.code, message: error.message }
                : { type: "error", code: "COACH_FAILED", message: COACH_FAILED_MESSAGE },
            ),
          );
        } finally {
          if (!cancellation.signal.aborted) controller.close();
        }
      },
      cancel() {
        cancellation.abort();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  });
}
