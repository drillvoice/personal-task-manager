"use client";

import { useState, useTransition } from "react";
import { createProject } from "@/app/(app)/projects/actions";

export function AddProjectForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"active" | "someday_maybe">("active");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await createProject({ name, status });
      if (res.ok) {
        setName("");
        onCreated();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-2 rounded-[4px] border p-3"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New project name…"
        className="min-w-[180px] flex-1 border p-2 text-[13px] outline-none"
        style={{
          background: "transparent",
          borderColor: "var(--color-line)",
          color: "var(--color-ink)",
        }}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <select
        value={status}
        onChange={(e) =>
          setStatus(e.target.value as "active" | "someday_maybe")
        }
        className="border p-2 text-[13px] outline-none"
        style={{
          background: "transparent",
          borderColor: "var(--color-line)",
          color: "var(--color-ink)",
        }}
      >
        <option value="active">active</option>
        <option value="someday_maybe">someday</option>
      </select>
      {error && (
        <span
          className="font-mono text-[11px]"
          style={{ color: "var(--color-danger)" }}
        >
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="font-mono px-3 py-1.5 text-[12px]"
        style={{ color: "var(--color-ink-soft)" }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={submit}
        disabled={pending || !name.trim()}
        className="font-mono px-3 py-1.5 text-[12px] font-semibold"
        style={{
          background: "var(--color-ink)",
          color: "var(--color-paper)",
          opacity: pending || !name.trim() ? 0.6 : 1,
        }}
      >
        Add
      </button>
    </div>
  );
}
