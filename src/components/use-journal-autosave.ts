"use client";

import { useRef, useState } from "react";
import { saveJournalBody } from "@/app/(app)/journal/actions";
import { useAutosave, type AutosaveResult } from "@/components/use-autosave";

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
 * Owns the journal body and its debounced save. Debouncing, retry and the
 * caught-throw handling live in `useAutosave`; what's left here is the tag
 * minting the journal alone does.
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
  const [createdTagNames, setCreatedTagNames] = useState<string[]>([]);
  const pendingCreates = useRef(new Map<string, string>());

  const autosave = useAutosave(
    initialBody,
    async (next): Promise<AutosaveResult> => {
      const creating = [...pendingCreates.current.values()];
      const result = await saveJournalBody({
        date,
        body: next,
        createTagNames: creating,
      });
      if (!result.ok) return result;
      for (const name of creating) {
        pendingCreates.current.delete(name.toLowerCase());
      }
      if (creating.length) {
        setCreatedTagNames((prev) => [...new Set([...prev, ...creating])]);
      }
      return { ok: true };
    },
  );

  return {
    value: autosave.value,
    setValue: autosave.setValue,
    flush: autosave.flush,
    registerTagCreate: (name) => {
      pendingCreates.current.set(name.toLowerCase(), name);
    },
    createdTagNames,
    error: autosave.error,
    pending: autosave.pending,
    dirty: autosave.dirty,
  };
}
