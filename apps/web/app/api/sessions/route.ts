import { createSession, deleteClientSessions, listSessions, type SessionFilters } from "@interviewiq/ai";
import { createSessionRequestSchema, Difficulty, InterviewType } from "@interviewiq/types";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getRequestClientId, readJson } from "@/lib/http";
import { apiError, apiOk } from "@/lib/api-response";
import { withMockMode } from "@/lib/with-mock-mode";

/** Create a draft session (status SETUP) for the setup page. */
export async function POST(request: Request) {
  return withMockMode(async () => {
    const body = await readJson(request);
    if (body === null) return apiError("INVALID_JSON");

    const parsed = createSessionRequestSchema.safeParse(body);
    if (!parsed.success) return apiError("INVALID_REQUEST");

    const rl = checkRateLimit(`sessions:${parsed.data.clientId}`, { maxRequests: 20, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    try {
      return apiOk(await createSession(parsed.data), { status: 201 });
    } catch (error) {
      return apiError(error, { log: "Session creation failed" });
    }
  });
}

const isDifficulty = (value: string): value is Difficulty => value in Difficulty;
const isInterviewType = (value: string): value is InterviewType => value in InterviewType;

/** Optional `?difficulty=&interviewType=` filters; null when either value is not a known enum member. */
function readFilters(params: URLSearchParams): SessionFilters | null {
  const difficulty = params.get("difficulty") || undefined;
  const interviewType = params.get("interviewType") || undefined;
  if (difficulty !== undefined && !isDifficulty(difficulty)) return null;
  if (interviewType !== undefined && !isInterviewType(interviewType)) return null;
  return { difficulty, interviewType };
}

/** List the caller's sessions, newest first, optionally filtered by difficulty and type. */
export async function GET(request: Request) {
  const clientId = getRequestClientId(request);
  if (!clientId) return apiError("CLIENT_ID_REQUIRED");

  const filters = readFilters(new URL(request.url).searchParams);
  if (!filters) return apiError("INVALID_REQUEST");

  try {
    return apiOk(await listSessions(clientId, filters));
  } catch (error) {
    return apiError(error, { log: "Session list failed" });
  }
}

/** Delete every session (with its questions, coach notes and report) owned by the caller. */
export async function DELETE(request: Request) {
  const clientId = getRequestClientId(request);
  if (!clientId) return apiError("CLIENT_ID_REQUIRED");

  const rl = checkRateLimit(`sessions-delete:${clientId}`, { maxRequests: 5, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    return apiOk({ deleted: await deleteClientSessions(clientId) });
  } catch (error) {
    return apiError(error, { log: "Bulk session delete failed" });
  }
}
