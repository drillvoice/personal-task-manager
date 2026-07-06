"use client";

import { useMemo, useState, useTransition } from "react";
import { Users } from "lucide-react";
import { createTask, createTaskTag } from "@/app/(app)/tasks/actions";
import { createProject } from "@/app/(app)/projects/actions";
import { createPerson } from "@/app/(app)/people/actions";
import { EntityPicker } from "@/components/entity-picker";
import type { PickerOption } from "@/components/entity-picker";
import type { ProjectSelectOption as ProjectOption } from "@/lib/server/projects";
import type { TagOption } from "@/lib/server/tasks";
import type { ContactOption } from "@/lib/server/people";

export function AddTaskForm({
  projects,
  people = [],
  tags = [],
  onCancel,
  onCreated,
  defaultProjectId,
  meetingId,
}: {
  projects: ProjectOption[];
  people?: ContactOption[];
  tags?: TagOption[];
  onCancel: () => void;
  onCreated: () => void;
  defaultProjectId?: string | null;
  meetingId?: string;
}) {
  const [title, setTitle] = useState("");
  // defaultProjectId: undefined = no preference (first real project),
  // null = explicitly Inbox.
  const [projectId, setProjectId] = useState<string>(
    defaultProjectId !== undefined
      ? (defaultProjectId ?? "")
      : (projects.find((p) => p.id !== null)?.id ?? ""),
  );
  const [dueDate, setDueDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
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

  const submit = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await createTask({
        title,
        projectId: projectId === "" ? null : projectId,
        assigneeIds,
        tagIds,
        meetingId: meetingId ?? null,
        dueDate: dueDate || null,
        status: "next_action",
      });
      if (res.ok) {
        setTitle("");
        setDueDate("");
        setAssigneeIds([]);
        setTagIds([]);
        onCreated();
      } else {
        setError(res.error);
      }
    });
  };

  const dateInput = (
    <input
      type="date"
      value={dueDate}
      onChange={(e) => setDueDate(e.target.value)}
      onClick={(e) => {
        try {
          e.currentTarget.showPicker();
        } catch {
          // showPicker throws on browsers that don't support it; the native
          // calendar affordance still works there.
        }
      }}
      className="w-full border p-2 text-[13px] outline-none sm:w-[160px]"
      style={{
        background: "transparent",
        borderColor: "var(--color-line)",
        color: "var(--color-ink)",
      }}
    />
  );

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
      {meetingId ? (
        <>
          <div className="mb-2">
            <EntityPicker
              mode="single"
              options={projectOptions}
              selectedIds={projectId ? [projectId] : []}
              onChange={(ids) => setProjectId(ids[0] ?? "")}
              onCreate={createProjectOption}
              placeholder="Inbox (no project)"
            />
          </div>
          <div className="mb-3">{dateInput}</div>
        </>
      ) : (
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(220px,1fr)_160px] sm:items-start">
          <div className="min-w-0">
            <EntityPicker
              mode="single"
              options={projectOptions}
              selectedIds={projectId ? [projectId] : []}
              onChange={(ids) => setProjectId(ids[0] ?? "")}
              onCreate={createProjectOption}
              placeholder="Inbox (no project)"
            />
          </div>
          {dateInput}
        </div>
      )}
      <div className="mb-3 sm:max-w-[320px]">
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
      <div className="mb-3 sm:max-w-[320px]">
        <EntityPicker
          mode="multi"
          options={tags}
          selectedIds={tagIds}
          onChange={setTagIds}
          onCreate={createTagOption}
          placeholder="Add tag…"
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
