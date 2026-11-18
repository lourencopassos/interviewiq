// Client-side mock mode helpers — reads/writes the cookie that controls mock mode.

const COOKIE_NAME = "interviewiq_mock_mode";

export function getMockMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes(`${COOKIE_NAME}=true`);
}

export function setMockModeClient(enabled: boolean): void {
  if (typeof document === "undefined") return;

  if (enabled) {
    // Set cookie with long expiry, SameSite=Lax for dev
    document.cookie = `${COOKIE_NAME}=true; path=/; max-age=31536000; SameSite=Lax`;
  } else {
    // Delete cookie
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  }
}

export function toggleMockMode(): boolean {
  const newValue = !getMockMode();
  setMockModeClient(newValue);
  return newValue;
}
