// Mock mode detection.
//
// The flag is scoped to the current async context (AsyncLocalStorage) so that
// concurrent requests never observe each other's setting. API routes wrap their
// handler in `runWithMockMode(enabled, fn)`; every promise chain spawned inside
// (including fire-and-forget TTS prefetches) inherits the flag.
//
// Mock mode is dev-only — the toggle component only renders in development.

import { AsyncLocalStorage } from "node:async_hooks";

declare global {
  // eslint-disable-next-line no-var
  var __mockModeStorage: AsyncLocalStorage<{ mock: boolean }> | undefined;
}

const storage: AsyncLocalStorage<{ mock: boolean }> =
  globalThis.__mockModeStorage ?? new AsyncLocalStorage<{ mock: boolean }>();
globalThis.__mockModeStorage = storage;

export function runWithMockMode<T>(enabled: boolean, fn: () => T): T {
  return storage.run({ mock: enabled }, fn);
}

export function isMockMode(): boolean {
  return storage.getStore()?.mock === true;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
