"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveJournalBody } from "@/app/(app)/journal/actions";

const SAVE_DEBOUNCE_MS = 800;
const SAVE_RETRY_MS = 5000;

export type JournalAutosave = {
  value: string;
  setValue: (next: string) => void;
  flush: () => void;
  /** Authorise minting a tag for this bare "#name" — see saveJournalBody. */
  registerTagCreate: (name: string) => void;
  createdTagNames: string[];
  error: string | null;
  pending: boolean;
  dirty: boolean;
};

/**
 * Owns the journal body and its debounced save.
 *
 * Lives above the Write/Read toggle on purpose. Held inside the editor, it was
 * torn down whenever the toggle unmounted that component and re-seeded from
 * whatever text was on screen — so a save that had *failed* came back looking
 * saved, with no error and no retry, and the note was lost on the next reload.
 */
export function useJournalAutosave(
  date: string,
  initialBody: string,
): JournalAutosave {
  const [value, setValue] = useState(initialBody);
  // State, not a ref: `dirty` is read during render, and a completed save has
  // to re-run the debounce effect so text typed mid-flight still gets saved.
  const [savedBody, setSavedBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [createdTagNames, setCreatedTagNames] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  // Bumped after a failed save so the debounce effect re-runs and tries again;
  // otherwise a note only retries when the user happens to type or blur.
  const [retryTick, setRetryTick] = useState(0);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCreates = useRef(new Map<string, string>());

  const scheduleRetry = () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(
      () => setRetryTick((n) => n + 1),
      SAVE_RETRY_MS,
    );
  };

  const save = (next: string) => {
    if (next === savedBody) return;
    const creating = [...pendingCreates.current.values()];
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof saveJournalBody>>;
      try {
        result = await saveJournalBody({
          date,
          body: next,
          createTagNames: creating,
        });
      } catch {
        // saveJournalBody only *returns* a failure for schema problems.
        // Everything else — offline, a redeploy mid-session, a database error
        // — throws, and an uncaught throw here takes the whole page down to
        // the error boundary with the note still unsaved.
        setError("couldn't reach the server");
        scheduleRetry();
        return;
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (retryTimer.current) clearTimeout(retryTimer.current);
      setError(null);
      setSavedBody(next);
      for (const name of creating) {
        pendingCreates.current.delete(name.toLowerCase());
      }
      if (creating.length) {
        setCreatedTagNames((prev) => [...new Set([...prev, ...creating])]);
      }
    });
  };

  useEffect(() => {
    if (value === savedBody) return;
    saveTimer.current = setTimeout(() => save(value), SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, savedBody, retryTick]);

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
      save(value);
    },
    registerTagCreate: (name) => {
      pendingCreates.current.set(name.toLowerCase(), name);
    },
    createdTagNames,
    error,
    pending,
    dirty: value !== savedBody,
  };
}
