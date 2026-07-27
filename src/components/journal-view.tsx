"use client";

import { useState } from "react";
import { JournalEditor } from "@/components/journal-editor";
import { JournalReader } from "@/components/journal-reader";
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
  // Lift the live body so Read mode reflects unsaved edits made in Write mode
  // (the editor owns autosave; this just keeps the two views in sync).
  const [liveBody, setLiveBody] = useState(body);

  return (
    <div>
      <div
        className="mb-2 inline-flex rounded-[4px] border p-0.5"
        style={{ borderColor: "var(--color-line)" }}
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
        <JournalEditor
          date={date}
          initialBody={liveBody}
          people={people}
          tags={tags}
          onBodyChange={setLiveBody}
        />
      ) : (
        <JournalReader body={liveBody} tags={tags} />
      )}
    </div>
  );
}
