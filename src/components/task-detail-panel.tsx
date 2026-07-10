"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Users, X } from "lucide-react";
import { EntityPicker } from "@/components/entity-picker";
import { AutosaveTextarea } from "@/components/autosave-textarea";
import {
  createPersonOption,
  createProjectOption,
  createTagOption,
} from "@/components/task-row";
import type { ContactOption } from "@/lib/server/people";
import type { TagOption, TasksViewTask } from "@/lib/server/tasks";
import { setTaskDone } from "@/app/(app)/today/actions";
import { deleteTask, updateTask } from "@/app/(app)/tasks/actions";

export function TaskDetailPanel({
  task,
  projects,
  people,
  tagOptions,
  onClose,
}: {
  task: TasksViewTask;
  projects: { id: string; name: string }[];
  people: ContactOption[];
  tagOptions: TagOption[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [projectId, setProjectId] = useState<string>(task.projectId ?? "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    task.assignees.map((a) => a.id),
  );
  const [tagIds, setTagIds] = useState<string[]>(task.tags.map((t) => t.id));
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Notes autosave fires from a debounced closure; read the latest field
  // values through a ref so a stale snapshot can't overwrite newer edits.
  const fieldsRef = useRef({ title, projectId, assigneeIds, tagIds, dueDate });
  fieldsRef.current = { title, projectId, assigneeIds, tagIds, dueDate };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const el = e.target as HTMLElement | null;
      // First Escape leaves the focused field (EntityPicker uses it to close
      // its dropdown); Escape outside a field closes the panel.
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
        el.blur();
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const commit = (
    overrides: Partial<{
      title: string;
      projectId: string;
      assigneeIds: string[];
      tagIds: string[];
      dueDate: string;
      notes: string;
    }> = {},
  ) => {
    const fields = { ...fieldsRef.current, ...overrides };
    if (!fields.title.trim()) return;
    startTransition(async () => {
      const res = await updateTask({ id: task.id, ...fields });
      setError(res.ok ? null : res.error);
    });
  };

  const complete = () => {
    startTransition(async () => {
      await setTaskDone(task.id, true);
    });
  };

  const del = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const res = await deleteTask(task.id);
      if (res.ok) onClose();
      else setError(res.error);
    });
  };

  return (
    <div
      className="rounded-[4px] border p-4"
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
          Task
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close task panel"
          className="-m-1 rounded p-1"
          style={{ color: "var(--color-ink-soft)" }}
        >
          <X size={16} />
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (title.trim() && title !== task.title) commit();
          else setTitle(task.title);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        aria-label="Task title"
        className="font-display mb-3 w-full border-b bg-transparent pb-2.5 text-[17px] font-semibold outline-none"
        style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
      />

      <button
        type="button"
        onClick={complete}
        disabled={pending}
        className="font-mono mb-4 flex items-center gap-2 text-[11px] font-medium"
        style={{ color: "var(--color-ink-soft)" }}
      >
        <span
          className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-[1.5px]"
          style={{ borderColor: "var(--color-ink-soft)" }}
        >
          <Check size={12} color="transparent" strokeWidth={3} />
        </span>
        Mark complete
      </button>

      <div className="mb-3.5">
        <span
          className="font-mono mb-1.5 block text-[10px] font-semibold tracking-[0.08em] uppercase"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Project
        </span>
        <EntityPicker
          mode="single"
          options={projects}
          selectedIds={projectId ? [projectId] : []}
          onChange={(ids) => {
            const next = ids[0] ?? "";
            setProjectId(next);
            commit({ projectId: next });
          }}
          onCreate={createProjectOption}
          placeholder="Inbox (no project)"
        />
      </div>

      <div className="mb-3.5">
        <span
          className="font-mono mb-1.5 block text-[10px] font-semibold tracking-[0.08em] uppercase"
          style={{ color: "var(--color-ink-soft)" }}
        >
          People
        </span>
        <EntityPicker
          mode="multi"
          options={people}
          selectedIds={assigneeIds}
          onChange={(ids) => {
            setAssigneeIds(ids);
            commit({ assigneeIds: ids });
          }}
          onCreate={createPersonOption}
          placeholder="Relationship"
          icon={Users}
        />
      </div>

      <div className="mb-3.5">
        <span
          className="font-mono mb-1.5 block text-[10px] font-semibold tracking-[0.08em] uppercase"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Tags
        </span>
        <EntityPicker
          mode="multi"
          options={tagOptions}
          selectedIds={tagIds}
          onChange={(ids) => {
            setTagIds(ids);
            commit({ tagIds: ids });
          }}
          onCreate={createTagOption}
          placeholder="Add tag…"
        />
      </div>

      <div className="mb-3.5">
        <span
          className="font-mono mb-1.5 block text-[10px] font-semibold tracking-[0.08em] uppercase"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Due
        </span>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => {
            setDueDate(e.target.value);
            commit({ dueDate: e.target.value });
          }}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker();
            } catch {
              // showPicker throws where unsupported; native affordance remains.
            }
          }}
          className="w-full border p-2 text-[13px] outline-none"
          style={{
            background: "transparent",
            borderColor: "var(--color-line)",
            color: "var(--color-ink)",
          }}
        />
      </div>

      <div className="mb-1">
        <span
          className="font-mono mb-1.5 block text-[10px] font-semibold tracking-[0.08em] uppercase"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Notes
        </span>
        <AutosaveTextarea
          initialValue={task.notes}
          onSave={(v) => updateTask({ id: task.id, ...fieldsRef.current, notes: v })}
          placeholder="Links, context, working detail…"
          rows={6}
        />
      </div>

      {error && (
        <p
          className="font-mono mb-2 text-[11px]"
          style={{ color: "var(--color-danger)" }}
        >
          {error}
        </p>
      )}

      <div
        className="flex items-center justify-between border-t pt-3"
        style={{ borderColor: "var(--color-line)" }}
      >
        <span>
          <button
            type="button"
            onClick={del}
            disabled={pending}
            className="font-mono text-[11px]"
            style={{
              color: confirmDelete
                ? "var(--color-danger)"
                : "var(--color-ink-soft)",
              fontWeight: confirmDelete ? 600 : 400,
            }}
          >
            {confirmDelete ? "Confirm delete?" : "Delete task"}
          </button>
          {confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="font-mono ml-2.5 text-[11px]"
              style={{ color: "var(--color-ink-soft)" }}
            >
              Keep
            </button>
          )}
        </span>
        <span
          className="font-mono text-[10px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          esc closes
        </span>
      </div>
    </div>
  );
}
