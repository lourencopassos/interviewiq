"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * A ref that always holds the latest `value`, for long-lived callbacks (window
 * listeners, EventSource handlers) that must see current state without being
 * re-subscribed on every render. Updated in a layout effect so the very next
 * browser event already sees the committed render.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
