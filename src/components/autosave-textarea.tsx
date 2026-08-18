"use client";

import { useAutosave, type AutosaveResult } from "@/components/use-autosave";

// Callers are server actions with assorted return shapes; anything that isn't
// an explicit `{ ok: false }` counts as saved.
function toResult(result: unknown): AutosaveResult {
  if (
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    (result as { ok: unknown }).ok === false
  ) {
    const { error } = result as { error?: string };
    return { ok: false, error: error ?? "Couldn't save" };
  }
  return { ok: true };
}

export function AutosaveTextarea({
  initialValue,
  onSave,
  onValueChange,
  placeholder,
  rows = 8,
}: {
  initialValue: string;
  onSave: (value: string) => Promise<unknown>;
  // Lets a parent mirror the text it isn't storing — the notes card renders the
  // saved body as tag chips beside the editor.
  onValueChange?: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const { value, setValue, flush, error, pending, dirty, unreachable } =
    useAutosave(initialValue, async (next) => toResult(await onSave(next)));

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onValueChange?.(e.target.value);
        }}
        onBlur={flush}
        placeholder={placeholder}
        rows={rows}
        className="gtd-scrollbar w-full resize-y card p-3 text-[13px] leading-relaxed outline-none text-ink"
      />
      <p
        className="font-mono mt-1 text-right text-[10px]"
        style={{
          color: error ? "var(--color-danger)" : "var(--color-ink-soft)",
          visibility: pending || dirty || error ? "visible" : "hidden",
        }}
      >
        {pending
          ? "Saving…"
          : unreachable
            ? `Not saved — ${error}, retrying`
            : error
              ? `Not saved — ${error}`
              : "Unsaved changes"}
      </p>
    </div>
  );
}
