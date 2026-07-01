"use client";

import { useState, useTransition } from "react";
import { createTask } from "@/app/(app)/tasks/actions";

type ProjectOption = { id: string | null; name: string };

export function AddTaskForm({
  projects,
  onCancel,
  onCreated,
  defaultProjectId,
}: {
  projects: ProjectOption[];
  onCancel: () => void;
  onCreated: () => void;
  defaultProjectId?: string | null;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>(
    defaultProjectId ?? projects.find((p) => p.id !== null)?.id ?? "",
  );
  const [priority, setPriority] = useState<1 | 2 | 3>(3);
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await createTask({
        title,
        projectId: projectId === "" ? null : projectId,
        priority,
        dueDate: dueDate || null,
        status: "next_action",
      });
      if (res.ok) {
        setTitle("");
        setDueDate("");
        onCreated();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div
      className="mb-4 rounded-[4px] border p-4"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title…"
        className="mb-2 w-full border p-2 text-[13px] outline-none"
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
      <div className="mb-3 grid grid-cols-2 gap-2">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="border p-2 text-[13px] outline-none"
          style={{
            background: "transparent",
            borderColor: "var(--color-line)",
            color: "var(--color-ink)",
          }}
        >
          <option value="">Inbox (no project)</option>
          {projects
            .filter((p) => p.id !== null)
            .map((p) => (
              <option key={p.id} value={p.id ?? ""}>
                {p.name}
              </option>
            ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="border p-2 text-[13px] outline-none"
          style={{
            background: "transparent",
            borderColor: "var(--color-line)",
            color: "var(--color-ink)",
          }}
        />
        <div className="col-span-2 flex items-center gap-1">
          {[1, 2, 3].map((p) => {
            const active = priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p as 1 | 2 | 3)}
                className="font-mono flex-1 border px-2.5 py-2 text-[11px] font-semibold"
                style={{
                  borderColor: active ? `var(--color-p${p})` : "var(--color-line)",
                  background: active ? `var(--color-p${p})` : "transparent",
                  color: active
                    ? "var(--color-paper-raised)"
                    : "var(--color-ink-soft)",
                }}
              >
                P{p}
              </button>
            );
          })}
        </div>
      </div>
      {error && (
        <p
          className="font-mono mb-2 text-[11px]"
          style={{ color: "var(--color-danger)" }}
        >
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
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
          disabled={pending || !title.trim()}
          className="font-mono px-3 py-1.5 text-[12px] font-semibold"
          style={{
            background: "var(--color-ink)",
            color: "var(--color-paper)",
            opacity: pending || !title.trim() ? 0.6 : 1,
          }}
        >
          Add task
        </button>
      </div>
    </div>
  );
}
