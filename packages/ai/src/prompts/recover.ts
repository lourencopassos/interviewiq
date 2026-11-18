import type { ZodTypeAny, z } from "zod";

/**
 * Recover a usable value from a model response that failed strict validation.
 *
 * 1. Try the raw output merged over the defaults (fixes missing fields).
 * 2. If that still fails (wrongly typed fields), fall back to the defaults only.
 *
 * Never throws for malformed input — the caller decides whether the defaults
 * are good enough to continue.
 */
export function recoverWithDefaults<S extends ZodTypeAny>(
  schema: S,
  raw: unknown,
  defaults: z.infer<S>,
  label: string,
): z.infer<S> {
  const rawObject =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const merged = schema.safeParse({ ...defaults, ...rawObject });
  if (merged.success) {
    console.warn(`[${label}] recovered response by merging defaults`);
    return merged.data;
  }

  console.error(
    `[${label}] response unusable, using defaults:`,
    merged.error.flatten().fieldErrors,
  );
  return defaults;
}
