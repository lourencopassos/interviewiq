import { NextResponse } from "next/server";
import { assertOwner } from "@/lib/session-owner";
import { listCoachNotes, streamCoachAnswer, OrchestratorError, COACH_MODEL } from "@interviewiq/ai";
import { coachRequestSchema, type CoachStreamEvent } from "@interviewiq/types";
import { checkRateLimit, rateLimitResponse, readJson } from "@/lib/rate-limit";
import { withMockMode } from "@/lib/with-mock-mode";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();
const line = (event: CoachStreamEvent) => encoder.encode(JSON.stringify(event) + "\n");

/** List this session's coach notes (used to restore the drawer after a refresh). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const owner = await assertOwner(id, request.headers.get("x-client-id"));
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
    const owner = await assertOwner(id, request.headers.get("x-client-id"));
    if (!owner.ok) return owner.response;
    const rl = checkRateLimit(`coach:${id}`, { maxRequests: 12, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const parsed = coachRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
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
      if (error instanceof OrchestratorError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.httpStatus });
      }
      console.error("Coach request failed:", error);
      return NextResponse.json({ error: "The coach is unavailable right now", code: "COACH_FAILED" }, { status: 502 });
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
          controller.enqueue(
            line({
              type: "error",
              code: error instanceof OrchestratorError ? error.code : "COACH_FAILED",
              message: error instanceof Error ? error.message : "Coach stream failed",
            }),
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
