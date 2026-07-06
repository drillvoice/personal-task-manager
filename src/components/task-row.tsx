"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Users } from "lucide-react";
import { DueLabel } from "@/components/due-label";
import { PriorityBadge } from "@/components/priority-badge";
import { TagChip } from "@/components/tag-chip";
import { EntityPicker } from "@/components/entity-picker";
import type { PickerOption } from "@/components/entity-picker";
import { createProject } from "@/app/(app)/projects/actions";
import { createPerson } from "@/app/(app)/people/actions";
import type { ProjectSelectOption as ProjectOption } from "@/lib/server/projects";
import type { TagOption } from "@/lib/server/tasks";
import type { ContactOption } from "@/lib/server/people";
import { setTaskDone } from "@/app/(app)/today/actions";
import { updateTask, deleteTask, createTaskTag } from "@/app/(app)/tasks/actions";

export type TaskRowProps = {
  task: {
    id: string;
    title: string;
    priority: 1 | 2 | 3 | null;
    status: "inbox" | "next_action" | "waiting_on" | "done";
    dueDate: string | null;
    projectId?: string | null;
    projectName: string | null;
    assignees?: { id: string; name: string }[];
    tags?: { id: string; name: string; color: string }[];
  };
  showProject?: boolean;
  layout?: "inline" | "stacked";
  projects?: ProjectOption[];
  people?: ContactOption[];
  tagOptions?: TagOption[];
};

function EditTaskForm({
  task,
  projects,
  people = [],
  tagOptions = [],
  onDone,
}: {
  task: TaskRowProps["task"];
  projects: ProjectOption[];
  people?: ContactOption[];
  tagOptions?: TagOption[];
  onDone: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [projectId, setProjectId] = useState<string>(task.projectId ?? "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    task.assignees?.map((a) => a.id) ?? [],
  );
  const [tagIds, setTagIds] = useState<string[]>(
    task.tags?.map((t) => t.id) ?? [],
  );
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const projectOptions = useMemo(
    () =>
      projects
        .filter((p): p is { id: string; name: string } => p.id !== null)
        .map((p) => ({ id: p.id, name: p.name })),
    [projects],
  );

  const createProjectOption = async (
    name: string,
  ): Promise<PickerOption | null> => {
    const res = await createProject({ name, status: "active" });
    return res.ok ? { id: res.id, name } : null;
  };

  const createPersonOption = async (
    name: string,
  ): Promise<PickerOption | null> => {
    const res = await createPerson({ name });
    return res.ok ? { id: res.id, name } : null;
  };

  const createTagOption = async (
    name: string,
  ): Promise<PickerOption | null> => {
    const res = await createTaskTag({ name });
    return res.ok ? { id: res.id, name: res.name, color: res.color } : null;
  };

  const save = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await updateTask({
        id: task.id,
        title,
        projectId,
        assigneeIds,
        tagIds,
        dueDate,
      });
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
      <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(220px,1fr)_160px] sm:items-start">
        <div className="min-w-0">
          <EntityPicker
            mode="single"
            options={projectOptions}
            selectedIds={projectId ? [projectId] : []}
            onChange={(ids) => setProjectId(ids[0] ?? "")}
            onCreate={createProjectOption}
            placeholder="Inbox (no project)"
          />
          <div className="mt-2">
            <EntityPicker
              mode="multi"
              options={people}
              selectedIds={assigneeIds}
              onChange={setAssigneeIds}
              onCreate={createPersonOption}
              placeholder="Relationship"
              icon={Users}
            />
          </div>
          <div className="mt-2">
            <EntityPicker
              mode="multi"
              options={tagOptions}
              selectedIds={tagIds}
              onChange={setTagIds}
              onCreate={createTagOption}
              placeholder="Add tag…"
            />
          </div>
        </div>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker();
            } catch {
              // showPicker throws where unsupported; native affordance remains.
            }
          }}
          className="w-full border p-2 text-[13px] outline-none sm:w-[160px]"
          style={{
            background: "transparent",
            borderColor: "var(--color-line)",
            color: "var(--color-ink)",
          }}
        />
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

export function TaskRow({
  task,
  showProject = false,
  layout = "inline",
  projects,
  people,
  tagOptions,
}: TaskRowProps) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const done = task.status === "done";
  const assigneeNames = (task.assignees ?? []).map((a) => a.name);
  const tags = task.tags ?? [];

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
        people={people}
        tagOptions={tagOptions}
        onDone={() => setEditing(false)}
      />
    );
  }

  const checkbox = (
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
  );

  const titleSpan = (
    <span
      className="text-[14px]"
      style={{
        color: done ? "var(--color-ink-soft)" : "var(--color-ink)",
        textDecoration: done ? "line-through" : "none",
        cursor: projects ? "pointer" : "default",
      }}
      onClick={projects ? () => setEditing(true) : undefined}
    >
      {task.title}
    </span>
  );

  const projectMeta = showProject && task.projectName && (
    <span className="font-mono text-[11px]" style={{ color: "var(--color-ink-soft)" }}>
      {task.projectName}
    </span>
  );

  const assigneeMeta = assigneeNames.length > 0 && (
    <span
      className="font-mono flex items-center gap-1 text-[10px]"
      style={{ color: "var(--color-ink-soft)" }}
    >
      <Users size={10} />
      {assigneeNames.join(", ")}
    </span>
  );

  const tagMeta = (
    <>
      <PriorityBadge priority={task.priority} />
      {task.status === "waiting_on" && <TagChip tone="accent">waiting</TagChip>}
      {tags.map((t) => (
        <TagChip key={t.id} color={t.color}>
          {t.name}
        </TagChip>
      ))}
      <DueLabel dateIso={task.dueDate} />
    </>
  );

  if (layout === "stacked") {
    return (
      <div
        className="border-b px-1 py-2.5"
        style={{ borderColor: "var(--color-line)" }}
      >
        <div className="mb-1.5">{titleSpan}</div>
        <div className="flex flex-wrap items-center gap-2">
          {checkbox}
          {projectMeta}
          {assigneeMeta}
          {tagMeta}
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex flex-wrap items-center gap-2 border-b px-1 py-2.5"
      style={{ borderColor: "var(--color-line)" }}
    >
      {checkbox}
      <span className="min-w-[120px] flex-1">{titleSpan}</span>
      {projectMeta}
      {assigneeMeta}
      {tagMeta}
    </div>
  );
}
