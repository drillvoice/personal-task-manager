"use client";

import { useEffect, useRef, useState, useTransition } from "react";

export function AutosaveTextarea({
  initialValue,
  onSave,
  placeholder,
  rows = 8,
}: {
  initialValue: string;
  onSave: (value: string) => Promise<unknown>;
  placeholder?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [prevInitial, setPrevInitial] = useState(initialValue);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adopt server-delivered content when a revalidation hands us a new
  // initialValue, but only if there are no unsaved local edits — otherwise a
  // background re-render would silently clobber whatever the user is typing.
  // React's render-time "adjust state on a prop change" pattern (not an effect).
  if (initialValue !== prevInitial) {
    setPrevInitial(initialValue);
    if (value === savedValue) {
      setValue(initialValue);
      setSavedValue(initialValue);
    }
  }

  const save = (v: string) => {
    if (v === savedValue) return;
    startTransition(async () => {
      await onSave(v);
      setSavedValue(v);
    });
  };

  useEffect(() => {
    if (value === savedValue) return;
    timer.current = setTimeout(() => save(value), 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, savedValue]);

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    save(value);
  };

  const dirty = value !== savedValue;

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={flush}
        placeholder={placeholder}
        rows={rows}
        className="gtd-scrollbar w-full resize-y rounded-[4px] border p-3 text-[13px] leading-relaxed outline-none"
        style={{
          background: "var(--color-paper-raised)",
          borderColor: "var(--color-line)",
          color: "var(--color-ink)",
        }}
      />
      <p
        className="font-mono mt-1 text-right text-[10px]"
        style={{
          color: "var(--color-ink-soft)",
          visibility: pending || dirty ? "visible" : "hidden",
        }}
      >
        {pending ? "Saving…" : "Unsaved changes"}
      </p>
    </div>
  );
}
