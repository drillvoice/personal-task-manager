"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Check, Users } from "lucide-react";
import { DueLabel } from "@/components/due-label";
import { PriorityBadge } from "@/components/priority-badge";
import { TagChip } from "@/components/tag-chip";
import { EntityPicker } from "@/components/entity-picker";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  createPersonOption,
  createProjectOption,
  createTaskTagOption,
} from "@/components/entity-create-options";
import type { ProjectSelectOption as ProjectOption } from "@/lib/server/projects";
import type { TagOption } from "@/lib/server/tasks";
import type { ContactOption } from "@/lib/server/people";
import { setTaskDone } from "@/app/(app)/today/actions";
import { updateTask, deleteTask } from "@/app/(app)/tasks/actions";

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
    // Display list — priority tags stripped, since the row shows a
    // PriorityBadge for those instead.
    tags?: { id: string; name: string; color: string }[];
    // Complete set for the inline editor; see TasksViewTask. Optional because
    // the Today rows don't carry tags at all and never open that editor.
    allTagIds?: string[];
    weekly?: boolean;
  };
  showProject?: boolean;
  layout?: "inline" | "stacked";
  projects?: ProjectOption[];
  people?: ContactOption[];
  tagOptions?: TagOption[];
  // When provided, the whole row selects the task (detail panel) instead of
  // swapping to the inline edit form.
  onSelect?: () => void;
  selected?: boolean;
  // Native drag-and-drop opt-in (used by "Also due today" to drag a row into
  // a Today/Tomorrow plan slot). Only wired up on the inline layout.
  draggable?: boolean;
  onTaskDragStart?: (e: React.DragEvent) => void;
  onTaskDragEnd?: (e: React.DragEvent) => void;
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
  // The complete set, not the display-filtered `tags` — saving replaces every
  // task_tag, so seeding from a list with priority tags stripped would delete
  // the task's priority on any unrelated tag edit.
  const [tagIds, setTagIds] = useState<string[]>(task.allTagIds ?? []);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const projectOptions = useMemo(
    () =>
      projects
        .filter((p): p is { id: string; name: string } => p.id !== null)
        .map((p) => ({ id: p.id, name: p.name })),
    [projects],
  );

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
    startTransition(async () => {
      await deleteTask(task.id);
      onDone();
    });
  };

  return (
    <div
      className="border-b px-1 py-3 border-line"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-2 w-full border p-2 text-[13px] outline-none border-line text-ink"
        style={{ background: "transparent" }}
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
              onCreate={createTaskTagOption}
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
          className="w-full border p-2 text-[13px] outline-none sm:w-[160px] border-line text-ink"
          style={{ background: "transparent" }}
        />
      </div>
      {error && (
        <p className="font-mono mb-2 text-[11px] text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <ConfirmDeleteButton
          label="Delete task"
          pending={pending}
          onConfirm={del}
        />
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onDone}
            className="font-mono px-3 py-1.5 text-[12px] text-ink-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !title.trim()}
            className="font-mono px-3 py-1.5 text-[12px] font-semibold bg-ink text-paper"
            style={{ opacity: pending || !title.trim() ? 0.6 : 1 }}
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
  onSelect,
  selected = false,
  draggable = false,
  onTaskDragStart,
  onTaskDragEnd,
}: TaskRowProps) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  // Optimistic: the strike-through lands on click, not after the server
  // roundtrip; reverts automatically if the action fails to revalidate.
  const [done, setOptimisticDone] = useOptimistic(task.status === "done");
  const assigneeNames = (task.assignees ?? []).map((a) => a.name);
  const tags = task.tags ?? [];
  const inlineEdit = Boolean(projects) && !onSelect;

  const toggle = () => {
    startTransition(async () => {
      setOptimisticDone(!done);
      await setTaskDone(task.id, !done);
    });
  };

  if (editing && projects && inlineEdit) {
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
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      disabled={pending}
      aria-pressed={done}
      aria-label={done ? "Mark task incomplete" : "Mark task complete"}
      className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-card border-[1.5px]"
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
        cursor: inlineEdit ? "pointer" : "default",
      }}
      onClick={inlineEdit ? () => setEditing(true) : undefined}
    >
      {task.title}
    </span>
  );

  const projectMeta = showProject && task.projectName && (
    <span className="font-mono text-[11px] text-ink-soft">
      {task.projectName}
    </span>
  );

  const assigneeMeta = assigneeNames.length > 0 && (
    <span
      className="font-mono flex items-center gap-1 text-[10px] text-ink-soft"
    >
      <Users size={10} />
      {assigneeNames.join(", ")}
    </span>
  );

  const tagMeta = (
    <>
      {task.weekly && (
        <span
          className="font-mono text-[10px] font-semibold text-accent"
          title="This week's priority"
        >
          ★ wk
        </span>
      )}
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
        className="border-b px-1 py-2.5 border-line"
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
      className="group flex flex-wrap items-center gap-2 border-b px-1 py-2.5 border-line"
      style={{ cursor: draggable ? "grab" : onSelect ? "pointer" : undefined,
        background: selected ? "var(--color-paper)" : undefined,
        boxShadow: selected ? "inset 2px 0 0 var(--color-accent)" : undefined }}
      draggable={draggable}
      onDragStart={onTaskDragStart}
      onDragEnd={onTaskDragEnd}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" && e.target === e.currentTarget) {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
    >
      {checkbox}
      <span className="min-w-[120px] flex-1">{titleSpan}</span>
      {projectMeta}
      {assigneeMeta}
      {tagMeta}
    </div>
  );
}
