/** Providers whose API key the server reads from the environment. */
export type ApiKeyProvider = "anthropic" | "openai" | "elevenlabs";

const ENV_VAR: Record<ApiKeyProvider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  elevenlabs: "ELEVENLABS_API_KEY",
};

/**
 * Thrown before calling a provider whose key is not configured, so routes can
 * answer with an actionable 503 instead of a generic upstream failure.
 */
export class MissingApiKeyError extends Error {
  readonly code = "MISSING_API_KEY";
  readonly envVar: string;

  constructor(public readonly provider: ApiKeyProvider) {
    super(`${ENV_VAR[provider]} is not set. Add it to apps/web/.env.local or enable mock mode.`);
    this.name = "MissingApiKeyError";
    this.envVar = ENV_VAR[provider];
  }
}

/** Return the provider's key, or throw MissingApiKeyError when it is empty or unset. */
export function requireApiKey(provider: ApiKeyProvider): string {
  const key = process.env[ENV_VAR[provider]]?.trim();
  if (!key) throw new MissingApiKeyError(provider);
  return key;
}
