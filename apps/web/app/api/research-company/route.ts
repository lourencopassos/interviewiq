import { researchCompanyRequestSchema } from "@interviewiq/types";
import { researchCompanyCached } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getRequestClientId, getRequestIp, readJson } from "@/lib/http";
import { apiError, apiOk } from "@/lib/api-response";
import { withMockMode } from "@/lib/with-mock-mode";

/** Company intelligence for the setup page, cached per company for 7 days. */
export async function POST(request: Request) {
  return withMockMode(async () => {
    const body = await readJson(request);
    if (body === null) return apiError("INVALID_JSON");

    const parsed = researchCompanyRequestSchema.safeParse(body);
    if (!parsed.success) return apiError("INVALID_REQUEST");

    const caller = parsed.data.clientId ?? getRequestClientId(request) ?? `ip:${getRequestIp(request)}`;
    const rl = checkRateLimit(`research:${caller}`, { maxRequests: 5, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Never throws: research is optional, an empty result lets the interview proceed.
    const { intel } = await researchCompanyCached(
      parsed.data.companyName,
      parsed.data.jobTitle,
      parsed.data.primarySkills,
    );
    return apiOk(intel);
  });
}
