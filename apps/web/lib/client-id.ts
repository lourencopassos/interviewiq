import { CLIENT_ID_COOKIE } from "@/lib/http";

const STORAGE_KEY = "interviewiq-client-id";
const ONE_YEAR_SECONDS = 31_536_000;

/**
 * Anonymous client id. localStorage is the source of truth; the id is also
 * mirrored into a cookie on every call so requests that can't carry a header
 * (EventSource, <audio>) still prove ownership, and browsers that predate the
 * cookie pick it up on their next visit.
 */
export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  document.cookie = `${CLIENT_ID_COOKIE}=${encodeURIComponent(id)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
  return id;
}
