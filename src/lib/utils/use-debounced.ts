"use client";

import { useEffect, useState } from "react";

/**
 * The value, once it has stopped changing for `delay` milliseconds.
 *
 * For search boxes that drive a request. `useDeferredValue` is the React-native
 * answer to a related problem, but it is about rendering priority — every
 * keystroke still produces a value, so a query keyed on it still issues a
 * request per character. This drops the intermediate ones entirely.
 *
 * The timer is cleared on every change, so a fast typist issues exactly one
 * request, when they pause.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
