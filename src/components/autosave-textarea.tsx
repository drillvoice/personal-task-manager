"use client";

import { useEffect, useRef, useState, useTransition } from "react";

function isFailure(result: unknown): result is { ok: false; error?: string } {
  return (
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    (result as { ok: unknown }).ok === false
  );
}

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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const lastSaved = useRef(initialValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = (v: string) => {
    if (v === lastSaved.current) return;
    startTransition(async () => {
      const result = await onSave(v);
      if (isFailure(result)) {
        setError(result.error ?? "Couldn't save");
        return;
      }
      setError(null);
      lastSaved.current = v;
    });
  };

  useEffect(() => {
    if (value === lastSaved.current) return;
    timer.current = setTimeout(() => save(value), 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    save(value);
  };

  const dirty = value !== lastSaved.current;

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
          color: error ? "var(--color-danger)" : "var(--color-ink-soft)",
          visibility: pending || dirty || error ? "visible" : "hidden",
        }}
      >
        {pending
          ? "Saving…"
          : error
            ? `Not saved — ${error}`
            : "Unsaved changes"}
      </p>
    </div>
  );
}
