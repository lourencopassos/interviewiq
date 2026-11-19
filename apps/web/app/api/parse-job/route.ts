import { parseJobRequestSchema } from "@interviewiq/types";
import { parseJobDescription } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getRequestClientId, getRequestIp, readJson } from "@/lib/http";
import { apiError, apiOk } from "@/lib/api-response";
import { withMockMode } from "@/lib/with-mock-mode";

/** Turn a pasted job description into structured job data. */
export async function POST(request: Request) {
  return withMockMode(async () => {
    const body = await readJson(request);
    if (body === null) return apiError("INVALID_JSON");

    const parsed = parseJobRequestSchema.safeParse(body);
    if (!parsed.success) return apiError("INVALID_REQUEST");

    const caller = parsed.data.clientId ?? getRequestClientId(request) ?? `ip:${getRequestIp(request)}`;
    const rl = checkRateLimit(`parse-job:${caller}`, { maxRequests: 10, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    try {
      return apiOk(await parseJobDescription(parsed.data.jobDescription));
    } catch (error) {
      return apiError(error, { fallback: "PARSE_FAILED", log: "Job parsing failed" });
    }
  });
}
