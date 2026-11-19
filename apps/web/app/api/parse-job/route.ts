import { NextResponse } from "next/server";
import { parseJobRequestSchema } from "@interviewiq/types";
import { parseJobDescription } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getRequestClientId, getRequestIp, readJson } from "@/lib/http";
import { errorResponse, jsonError } from "@/lib/api-response";
import { withMockMode } from "@/lib/with-mock-mode";

export async function POST(request: Request) {
  return withMockMode(async () => {
    const body = await readJson(request);
    if (body === null) {
      return jsonError(400, "INVALID_JSON", "Invalid JSON body");
    }

    const parsed = parseJobRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "INVALID_REQUEST", "Invalid request", { details: parsed.error.flatten() });
    }

    const caller = parsed.data.clientId ?? getRequestClientId(request) ?? `ip:${getRequestIp(request)}`;
    const rl = checkRateLimit(`parse-job:${caller}`, { maxRequests: 10, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    try {
      const result = await parseJobDescription(parsed.data.jobDescription);
      return NextResponse.json(result);
    } catch (error) {
      console.error("Job parsing failed:", error);
      return errorResponse(error, {
        status: 502,
        code: "PARSE_FAILED",
        error: "Failed to parse job description. Please try again.",
      });
    }
  });
}
