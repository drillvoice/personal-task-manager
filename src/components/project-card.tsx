"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TaskRow } from "@/components/task-row";
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
}: {
  project: TasksViewProject;
  visibleTasks: TasksViewTask[];
  defaultOpen: boolean;
  showTaskProject?: boolean;
  projects?: ProjectOption[];
  people?: ContactOption[];
  tagOptions?: TagOption[];
}) {
  const [open, setOpen] = useState(defaultOpen);
  const activeCount = project.tasks.filter((t) => t.status !== "done").length;

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
            />
          ))}
        </div>
      )}
    </div>
  );
}
