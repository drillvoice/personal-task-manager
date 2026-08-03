"use client";

import { useEffect, useRef, useState, useTransition } from "react";

const SAVE_DEBOUNCE_MS = 800;
const SAVE_RETRY_MS = 5000;

export type AutosaveResult = { ok: true } | { ok: false; error: string };

export type Autosave = {
  value: string;
  setValue: (next: string) => void;
  /** Save now — on blur — instead of waiting out the debounce. */
  flush: () => void;
  error: string | null;
  pending: boolean;
  dirty: boolean;
  /** The last attempt never reached the server, so a retry is queued. */
  unreachable: boolean;
};

/**
 * Debounced autosave for a single text field.
 *
 * Two things here are load-bearing, both learned in the journal editor:
 *
 * - A *thrown* server action — offline, a redeploy mid-session, a database
 *   error — is caught rather than left to reach the error boundary, which would
 *   take the whole page down with the text still unsaved. Only schema failures
 *   come back as a returned `{ ok: false }`. Unreachable attempts are retried on
 *   a timer, since otherwise the field only tries again if the user happens to
 *   type or blur.
 * - `save` is called through a ref so a debounced fire always runs the latest
 *   closure, not one captured a keystroke ago.
 */
export function useAutosave(
  initialValue: string,
  save: (value: string) => Promise<AutosaveResult>,
): Autosave {
  const [value, setValue] = useState(initialValue);
  // State, not a ref: `dirty` is read during render, and a completed save has
  // to re-run the debounce effect so text typed mid-flight still gets saved.
  const [savedValue, setSavedValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [pending, startTransition] = useTransition();

  // Bumped after an unreachable save so the debounce effect re-runs.
  const [retryTick, setRetryTick] = useState(0);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refreshed after commit rather than during render: the debounce is ≥800ms,
  // so a fire always sees the latest closure either way.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const attempt = (next: string) => {
    if (next === savedValue) return;
    startTransition(async () => {
      let result: AutosaveResult;
      try {
        result = await saveRef.current(next);
      } catch {
        setError("couldn't reach the server");
        setUnreachable(true);
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(
          () => setRetryTick((n) => n + 1),
          SAVE_RETRY_MS,
        );
        return;
      }
      // Anything the server actually answered — including a rejection — settles
      // the attempt; retrying the same text would only get the same answer.
      if (retryTimer.current) clearTimeout(retryTimer.current);
      setUnreachable(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setSavedValue(next);
    });
  };

  useEffect(() => {
    if (value === savedValue) return;
    saveTimer.current = setTimeout(() => attempt(value), SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, savedValue, retryTick]);

  useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  return {
    value,
    setValue,
    flush: () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      attempt(value);
    },
    error,
    pending,
    dirty: value !== savedValue,
    unreachable,
  };
}
