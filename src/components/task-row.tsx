"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { DueLabel } from "@/components/due-label";
import { PriorityBadge } from "@/components/priority-badge";
import { TagChip } from "@/components/tag-chip";
import { ProjectDropdown } from "@/components/project-dropdown";
import type { ProjectOption } from "@/components/project-dropdown";
import { setTaskDone } from "@/app/(app)/today/actions";
import { updateTask, deleteTask } from "@/app/(app)/tasks/actions";

export type TaskRowProps = {
  task: {
    id: string;
    title: string;
    priority: 1 | 2 | 3;
    status: "inbox" | "next_action" | "waiting_on" | "done";
    dueDate: string | null;
    projectId?: string | null;
    projectName: string | null;
  };
  tags?: { name: string }[];
  showProject?: boolean;
  projects?: ProjectOption[];
};

function EditTaskForm({
  task,
  projects,
  onDone,
}: {
  task: TaskRowProps["task"];
  projects: ProjectOption[];
  onDone: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [projectId, setProjectId] = useState<string>(task.projectId ?? "");
  const [priority, setPriority] = useState<1 | 2 | 3>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await updateTask({ id: task.id, title, projectId, priority, dueDate });
      if (res.ok) {
        onDone();
      } else {
        setError(res.error);
      }
    });
  };

  const del = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      await deleteTask(task.id);
      onDone();
    });
  };

  return (
    <div
      className="border-b px-1 py-3"
      style={{ borderColor: "var(--color-line)" }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-2 w-full border p-2 text-[13px] outline-none"
        style={{
          background: "transparent",
          borderColor: "var(--color-line)",
          color: "var(--color-ink)",
        }}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
          if (e.key === "Escape") onDone();
        }}
      />
      <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(220px,1fr)_160px_auto] sm:items-start">
        <div className="min-w-0">
          <ProjectDropdown
            projects={projects}
            value={projectId}
            onChange={setProjectId}
          />
        </div>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full border p-2 text-[13px] outline-none sm:w-[160px]"
          style={{
            background: "transparent",
            borderColor: "var(--color-line)",
            color: "var(--color-ink)",
          }}
        />
        <div className="grid grid-cols-3 gap-1 sm:flex">
          {([1, 2, 3] as const).map((p) => {
            const active = priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className="font-mono border px-2.5 py-1.5 text-[11px] font-semibold"
                style={{
                  borderColor: active ? `var(--color-p${p})` : "var(--color-line)",
                  background: active ? `var(--color-p${p})` : "transparent",
                  color: active ? "var(--color-paper-raised)" : "var(--color-ink-soft)",
                }}
              >
                P{p}
              </button>
            );
          })}
        </div>
      </div>
      {error && (
        <p className="font-mono mb-2 text-[11px]" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={del}
          disabled={pending}
          className="font-mono text-[11px]"
          style={{ color: confirmDelete ? "var(--color-danger)" : "var(--color-ink-soft)" }}
        >
          {confirmDelete ? "Confirm delete?" : "Delete task"}
        </button>
        {confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="font-mono ml-2 text-[11px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Keep
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onDone}
            className="font-mono px-3 py-1.5 text-[12px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !title.trim()}
            className="font-mono px-3 py-1.5 text-[12px] font-semibold"
            style={{
              background: "var(--color-ink)",
              color: "var(--color-paper)",
              opacity: pending || !title.trim() ? 0.6 : 1,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function TaskRow({ task, tags = [], showProject = false, projects }: TaskRowProps) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const done = task.status === "done";

  const toggle = () => {
    startTransition(async () => {
      await setTaskDone(task.id, !done);
    });
  };

  if (editing && projects) {
    return (
      <EditTaskForm
        task={task}
        projects={projects}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <div
      className="group flex flex-wrap items-center gap-2 border-b px-1 py-2.5"
      style={{ borderColor: "var(--color-line)" }}
    >
      <button
        onClick={toggle}
        disabled={pending}
        aria-pressed={done}
        aria-label={done ? "Mark task incomplete" : "Mark task complete"}
        className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px]"
        style={{
          background: done ? "var(--color-teal)" : "transparent",
          borderColor: done ? "var(--color-teal)" : "var(--color-ink-soft)",
        }}
      >
        {done && <Check size={12} color="var(--color-paper-raised)" strokeWidth={3} />}
      </button>
      <span
        className="min-w-[120px] flex-1 text-[14px]"
        style={{
          color: done ? "var(--color-ink-soft)" : "var(--color-ink)",
          textDecoration: done ? "line-through" : "none",
          cursor: projects ? "pointer" : "default",
        }}
        onClick={projects ? () => setEditing(true) : undefined}
      >
        {task.title}
      </span>
      {showProject && task.projectName && (
        <span
          className="font-mono text-[11px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {task.projectName}
        </span>
      )}
      <PriorityBadge priority={task.priority} />
      {task.status === "waiting_on" && <TagChip tone="accent">waiting</TagChip>}
      {tags.map((t) => (
        <TagChip key={t.name}>{t.name}</TagChip>
      ))}
      <DueLabel dateIso={task.dueDate} />
    </div>
  );
}
