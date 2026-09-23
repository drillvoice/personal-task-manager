"use client";

import { useState, useTransition } from "react";
import { quickAddTask } from "@/app/(app)/review/actions";

/**
 * State for a one-line `quickAddTask` input. The input clears the moment
 * Enter is pressed and never disables, because the transition stays pending
 * until the revalidated page arrives — on a cold start that is the slow part,
 * and a disabled input also drops focus between captures. A rejected save puts
 * the text back, unless something new has been typed in the meantime.
 */
export function useQuickAdd(projectId: string | null) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const submit = (): boolean => {
    const title = value.trim();
    if (!title) return false;
    setValue("");
    setError(null);
    startTransition(async () => {
      const res = await quickAddTask({ title, projectId });
      if (!res.ok) {
        setValue((current) => (current === "" ? title : current));
        setError(res.error);
      }
    });
    return true;
  };

  return { value, setValue, submit, error };
}
