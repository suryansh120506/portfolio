"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reads a media query without ever calling setState from an effect.
 *
 * `useSyncExternalStore` is the right tool here rather than the usual
 * useState + useEffect pair: a media query IS an external store, and the
 * React Compiler in this project rejects set-state-in-effect outright.
 * It also gives a defined server snapshot, so the markup React renders on
 * the server matches the first client render instead of hydrating twice.
 *
 * The server snapshot is deliberately the DESKTOP answer (false). Server
 * rendering has no viewport, and guessing "mobile" would mean every desktop
 * visitor gets a flash of the reduced layout before it corrects.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * Phone-sized viewport. Matches Tailwind's `lg` breakpoint so the JS and the
 * CSS agree on where "small" starts — a mismatch between the two is how you
 * get a layout that hides something in CSS while JS still pays for it.
 */
export function useIsCompact(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}
