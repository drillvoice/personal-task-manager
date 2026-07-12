"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { quickAddTask } from "@/app/(app)/review/actions";

/**
 * Global quick capture — reachable from every screen (spec §6). Captures to
 * the Inbox pseudo-project with the same `#tag` syntax as the review flow's
 * quick-add. Opens via the floating button or the `c` key.
 */
export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [captured, setCaptured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const capturedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "c" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (capturedTimer.current) clearTimeout(capturedTimer.current);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    startTransition(async () => {
      const res = await quickAddTask({ title: t, projectId: null });
      if (res.ok) {
        setTitle("");
        setError(null);
        setCaptured(true);
        if (capturedTimer.current) clearTimeout(capturedTimer.current);
        capturedTimer.current = setTimeout(() => setCaptured(false), 1500);
      } else {
        setError(res.error);
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quick capture a task"
        className="fixed right-4 bottom-4 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-md md:right-6 md:bottom-6 print:hidden"
        style={{
          background: "var(--color-accent)",
          color: "var(--color-paper-raised)",
        }}
      >
        <Plus size={20} />
      </button>
    );
  }

  return (
    <div
      className="fixed right-4 bottom-4 z-50 w-[min(360px,calc(100vw-2rem))] rounded-[4px] border p-3 shadow-md md:right-6 md:bottom-6 print:hidden"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className="font-mono text-[10px] font-semibold tracking-[0.08em] uppercase"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Quick capture
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close quick capture"
          className="-m-1 rounded p-1"
          style={{ color: "var(--color-ink-soft)" }}
        >
          <X size={14} />
        </button>
      </div>
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        disabled={pending}
        placeholder="Capture a task… (#tag, or a due date like 'in 3 days')"
        className="w-full rounded-[4px] border p-2 text-[13px] outline-none"
        style={{
          background: "var(--color-paper)",
          borderColor: "var(--color-line)",
          color: "var(--color-ink)",
        }}
      />
      <p
        className="font-mono mt-1.5 text-[10px]"
        style={{
          color: error ? "var(--color-danger)" : "var(--color-ink-soft)",
        }}
      >
        {error ?? (captured ? "Captured to Inbox ✓" : "Saves to Inbox · esc closes")}
      </p>
    </div>
  );
}
