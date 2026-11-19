import { cookies } from "next/headers";
import { runWithMockMode } from "@interviewiq/ai";
import { MOCK_MODE_COOKIE } from "./mock-mode";


/**
 * Run a route handler with mock mode scoped to this request's async context.
 * Mock mode is a dev-only convenience; the cookie is ignored in production.
 */
export async function withMockMode<T>(handler: () => Promise<T>): Promise<T> {
  let isMock = false;
  if (process.env.NODE_ENV !== "production") {
    const cookieStore = await cookies();
    isMock = cookieStore.get(MOCK_MODE_COOKIE)?.value === "true";
  }
  return runWithMockMode(isMock, handler);
}
