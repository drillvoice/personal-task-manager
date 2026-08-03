"use client";

import { useSyncExternalStore } from "react";

// The detail panels on Tasks, People and Project overview are desktop-only;
// below md, rows keep inline editing.
const DESKTOP_QUERY = "(min-width: 768px)";

export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(DESKTOP_QUERY);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    // The server can't know the viewport; rendering the mobile branch first
    // means no panel markup is sent that the client would have to discard.
    () => false,
  );
}
