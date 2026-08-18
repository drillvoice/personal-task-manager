"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/button";
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
      className="mb-4 flex flex-wrap items-center gap-2 card p-3"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New project name…"
        className="min-w-[180px] flex-1 border p-2 text-[13px] outline-none border-line text-ink"
        style={{ background: "transparent" }}
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
        className="border p-2 text-[13px] outline-none border-line text-ink"
        style={{ background: "transparent" }}
      >
        <option value="active">active</option>
        <option value="someday_maybe">someday</option>
      </select>
      {error && (
        <span
          className="font-mono text-[11px] text-danger"
        >
          {error}
        </span>
      )}
      <Button
        variant="quiet"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={submit}
        disabled={pending || !name.trim()}
      >
        Add
      </Button>
    </div>
  );
}
