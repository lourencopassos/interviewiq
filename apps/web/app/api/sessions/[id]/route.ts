import { abandonSession, deleteSession, getSessionSummary } from "@interviewiq/ai";
import { updateSessionRequestSchema } from "@interviewiq/types";
import { readJson } from "@/lib/http";
import { apiError, apiOk } from "@/lib/api-response";
import { assertOwner } from "@/lib/session-owner";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const owner = await assertOwner(id, request);
  if (!owner.ok) return owner.response;

  try {
    return apiOk(await getSessionSummary(id));
  } catch (error) {
    return apiError(error, { log: "Session fetch failed" });
  }
}

/**
 * The only client-driven status transition is abandoning an in-progress interview.
 * Every other transition is owned by the orchestrator.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = updateSessionRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError("INVALID_REQUEST");

  const owner = await assertOwner(id, request, parsed.data.clientId);
  if (!owner.ok) return owner.response;
  if (owner.session.status === "COMPLETED") return apiError("ALREADY_COMPLETED");

  try {
    await abandonSession(id);
    return apiOk({ id, status: "ABANDONED" });
  } catch (error) {
    return apiError(error, { log: "Session update failed" });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const owner = await assertOwner(id, request);
  if (!owner.ok) return owner.response;

  try {
    await deleteSession(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiError(error, { log: "Session delete failed" });
  }
}
