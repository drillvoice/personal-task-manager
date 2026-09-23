"use client";

import { useEffect, useRef, useState, useTransition } from "react";

const SAVE_DEBOUNCE_MS = 800;
const SAVE_RETRY_MS = 5000;

export type AutosaveResult = { ok: true } | { ok: false; error: string };

/*
 * Text saved this session, keyed by field, with the server value the edit
 * started from.
 *
 * Autosave targets deliberately don't revalidate, so the page payload the
 * router holds (Back/Forward, and the client cache — see `staleTimes` in
 * next.config.ts) keeps the pre-edit text. A field remounted from that payload
 * would show the old text, and the next keystroke would save it over the newer
 * one. Module scope outlives remounts and client navigations, and a full
 * reload — the one thing that clears it — also fetches fresh text.
 */
const savedDrafts = new Map<string, { base: string; saved: string }>();

/**
 * The text a field keyed `key` should open with, given the server's value.
 *
 * Still the value an earlier edit started from → the payload predates that
 * edit, so the saved text wins. Anything else → the server has caught up (or
 * the text was changed elsewhere since), so it wins and the entry is dropped.
 */
export function resolveDraft(
  key: string,
  serverValue: string,
): { base: string; text: string } {
  const entry = savedDrafts.get(key);
  if (entry && serverValue === entry.base) {
    return { base: entry.base, text: entry.saved };
  }
  savedDrafts.delete(key);
  return { base: serverValue, text: serverValue };
}

export function recordDraft(key: string, base: string, saved: string): void {
  savedDrafts.set(key, { base, saved });
}

/**
 * Seed for a text field saved without revalidation, plus the hook to record
 * each successful save. `useAutosave` uses it; a field with its own save
 * cadence (e.g. save-on-blur) can use it directly.
 */
export function useSavedDraft(
  key: string,
  serverValue: string,
): { initial: string; recordSaved: (text: string) => void } {
  const [{ base, text }] = useState(() => resolveDraft(key, serverValue));
  return {
    initial: text,
    recordSaved: (saved) => recordDraft(key, base, saved),
  };
}

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
 *
 * `key` names the field (e.g. `task-notes:<id>`) so a remount opens on the
 * last saved text rather than a stale server value — see `savedDrafts`.
 */
export function useAutosave(
  key: string,
  initialValue: string,
  save: (value: string) => Promise<AutosaveResult>,
): Autosave {
  const { initial, recordSaved } = useSavedDraft(key, initialValue);
  const [value, setValue] = useState(initial);
  // State, not a ref: `dirty` is read during render, and a completed save has
  // to re-run the debounce effect so text typed mid-flight still gets saved.
  const [savedValue, setSavedValue] = useState(initial);
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
      recordSaved(next);
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
