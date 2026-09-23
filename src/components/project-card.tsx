"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { TaskRow } from "@/components/task-row";
import { useQuickAdd } from "@/components/use-quick-add";
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
  const quickAdd = useQuickAdd(project.id);
  const activeCount = project.tasks.filter((t) => t.status !== "done").length;

  return (
    <div
      className="mb-2 card"
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
          className="font-mono text-[11px] text-ink-soft"
        >
          {activeCount} open
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          {visibleTasks.length === 0 && (
            <p
              className="py-2 text-[12px] text-ink-soft"
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

            <Plus className="text-ink-soft" size={14} />
            <input
              value={quickAdd.value}
              onChange={(e) => quickAdd.setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  quickAdd.submit();
                }
              }}
              placeholder="Add a task… (#tag, or a due date like 'in 3 days')"
              className="flex-1 bg-transparent text-[13px] outline-none text-ink"
            />
          </div>
          {quickAdd.error && (
            <p className="font-mono mt-1 text-[11px] text-danger">
              Not saved — {quickAdd.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
