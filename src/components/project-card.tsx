"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, NotebookPen, Plus } from "lucide-react";
import { TaskRow } from "@/components/task-row";
import { AutosaveTextarea } from "@/components/autosave-textarea";
import { quickAddTask } from "@/app/(app)/review/actions";
import { updateProjectCurrentNotes } from "@/app/(app)/projects/actions";
import type { ProjectSelectOption as ProjectOption } from "@/lib/server/projects";
import type { ContactOption } from "@/lib/server/people";
import type {
  TagOption,
  TasksViewProject,
  TasksViewTask,
} from "@/lib/server/tasks";

export function ProjectCard({
  project,
  visibleTasks,
  defaultOpen,
  showTaskProject = false,
  projects,
  people,
  tagOptions,
  selectedTaskId,
  onSelectTask,
}: {
  project: TasksViewProject;
  visibleTasks: TasksViewTask[];
  defaultOpen: boolean;
  showTaskProject?: boolean;
  projects?: ProjectOption[];
  people?: ContactOption[];
  tagOptions?: TagOption[];
  selectedTaskId?: string | null;
  onSelectTask?: (id: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [notesOpen, setNotesOpen] = useState(false);
  const [action, setAction] = useState("");
  const [pending, startTransition] = useTransition();
  const activeCount = project.tasks.filter((t) => t.status !== "done").length;

  const submitAction = () => {
    const title = action.trim();
    if (!title) return;
    startTransition(async () => {
      const res = await quickAddTask({ title, projectId: project.id });
      if (res.ok) setAction("");
    });
  };

  return (
    <div
      className="mb-2 rounded-[4px] border"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-3 text-left"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="font-display flex-1 text-[15px] font-semibold">
          {project.name}
        </span>
        <span
          className="font-mono text-[11px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {activeCount} open
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          {project.notes && (
            <p
              className="mb-2 border-b pb-2 text-[13px]"
              style={{
                color: "var(--color-ink-soft)",
                borderColor: "var(--color-line)",
              }}
            >
              {project.notes}
            </p>
          )}
          {project.id !== null && (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setNotesOpen((s) => !s)}
                className="font-mono flex items-center gap-1.5 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase"
                style={{ color: "var(--color-ink-soft)" }}
              >
                <NotebookPen size={11} />
                Project notes
                {!notesOpen && project.currentNotes.trim() && (
                  <span style={{ color: "var(--color-teal)" }}>·</span>
                )}
              </button>
              {notesOpen && (
                <AutosaveTextarea
                  initialValue={project.currentNotes}
                  onSave={(v) =>
                    updateProjectCurrentNotes({
                      projectId: project.id!,
                      notes: v,
                    })
                  }
                  placeholder="State of the project — the why, the context, what's true right now…"
                  rows={5}
                />
              )}
            </div>
          )}
          {visibleTasks.length === 0 && (
            <p
              className="py-2 text-[12px]"
              style={{ color: "var(--color-ink-soft)" }}
            >
              No tasks.
            </p>
          )}
          {visibleTasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              showProject={showTaskProject}
              projects={projects}
              people={people}
              tagOptions={tagOptions}
              selected={t.id === selectedTaskId}
              onSelect={onSelectTask ? () => onSelectTask(t.id) : undefined}
            />
          ))}
          <div className="flex items-center gap-2 px-1 py-3">

            <Plus size={14} style={{ color: "var(--color-ink-soft)" }} />
            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitAction();
                }
              }}
              disabled={pending}
              placeholder="Add a task… (#tag adds a tag)"
              className="flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: "var(--color-ink)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
