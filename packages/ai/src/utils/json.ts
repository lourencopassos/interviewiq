/** Parse a JSON-encoded array column, tolerating null/corrupt values. */
export function parseJsonArray<T = unknown>(
  raw: string | null | undefined,
  guard?: (item: unknown) => item is T,
): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return guard ? parsed.filter(guard) : (parsed as T[]);
  } catch {
    return [];
  }
}

export const isString = (value: unknown): value is string => typeof value === "string";

/** Parse a JSON object column, returning null for missing/corrupt values. */
export function parseJsonObject(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
