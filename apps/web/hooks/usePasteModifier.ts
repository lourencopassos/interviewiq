"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

function isApplePlatform(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/**
 * The modifier key for paste on this device: ⌘ on Apple platforms, Ctrl
 * elsewhere. The server render (and hydration) uses ⌘; the client value
 * applies right after mount without a hydration mismatch.
 */
export function usePasteModifier(): "⌘" | "Ctrl" {
  return useSyncExternalStore(
    subscribe,
    () => (isApplePlatform() ? "⌘" : "Ctrl"),
    () => "⌘",
  );
}
