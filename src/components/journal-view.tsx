"use client";

import { useState } from "react";
import { JournalEditor } from "@/components/journal-editor";
import { JournalReader } from "@/components/journal-reader";
import { useJournalAutosave } from "@/components/use-journal-autosave";
import type { ContactOption } from "@/lib/server/people";
import type { TagOption } from "@/lib/server/meetings";

type Mode = "edit" | "read";

export function JournalView({
  date,
  body,
  people,
  tags,
  initialMode,
}: {
  date: string;
  body: string;
  people: ContactOption[];
  tags: TagOption[];
  initialMode: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  // Owned here rather than in the editor so toggling to Read and back doesn't
  // tear down in-flight or failed saves. Read mode renders the same live text.
  const autosave = useJournalAutosave(date, body);

  return (
    <div>
      <div
        className="mb-2 inline-flex rounded-card border p-0.5 border-line"
      >
        {(["edit", "read"] as const).map((m) => {
          const activeMode = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="font-mono rounded-[3px] px-2.5 py-1 text-[11px] font-medium"
              style={{
                background: activeMode ? "var(--color-accent-soft)" : "transparent",
                color: activeMode ? "var(--color-accent)" : "var(--color-ink-soft)",
              }}
            >
              {m === "edit" ? "Write" : "Read"}
            </button>
          );
        })}
      </div>

      {mode === "edit" ? (
        <JournalEditor autosave={autosave} people={people} tags={tags} />
      ) : (
        <JournalReader body={autosave.value} tags={tags} />
      )}
    </div>
  );
}
