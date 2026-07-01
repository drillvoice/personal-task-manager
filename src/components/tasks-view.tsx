"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { ProjectCard } from "@/components/project-card";
import { TaskRow } from "@/components/task-row";
import {
  SmartSearchBar,
  hasActiveFilters,
  makeEmptyFilters,
  type SmartFilters,
} from "@/components/smart-search-bar";
import type { TasksViewProject, TasksViewTask } from "@/lib/server/tasks";

type Mode = "by_project" | "all_tasks";
type ProjectFilter = "active" | "someday_maybe" | "all";

const AddTaskForm = dynamic(() =>
  import("@/components/add-task-form").then((mod) => mod.AddTaskForm),
);

export function TasksView({ projects }: { projects: TasksViewProject[] }) {
  const [mode, setMode] = useState<Mode>("by_project");
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("active");
  const [filters, setFilters] = useState<SmartFilters>(makeEmptyFilters());
  const [showAdd, setShowAdd] = useState(false);

  const allTasksFlat = useMemo(
    () => projects.flatMap((p) => p.tasks),
    [projects],
  );

  const availableTags = useMemo(
    () =>
      Array.from(
        new Set(allTasksFlat.flatMap((t) => t.tags.map((tg) => tg.name))),
      ).sort(),
    [allTasksFlat],
  );

  const active = hasActiveFilters(filters);

  const matches = (t: TasksViewTask): boolean => {
    if (
      filters.search.trim() &&
      !t.title.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }
    if (filters.priorities.size && !filters.priorities.has(t.priority)) {
      return false;
    }
    if (filters.statuses.size) {
      if (
        !(
          (filters.statuses.has("next_action") && t.status === "next_action") ||
          (filters.statuses.has("waiting_on") && t.status === "waiting_on")
        )
      ) {
        return false;
      }
    }
    if (filters.tags.size) {
      const taskTagNames = new Set(t.tags.map((tg) => tg.name));
      let hit = false;
      for (const tag of filters.tags) if (taskTagNames.has(tag)) hit = true;
      if (!hit) return false;
    }
    return true;
  };

  const projectsForMode = projects.filter((p) => {
    if (projectFilter === "all") return true;
    if (projectFilter === "someday_maybe") return p.status === "someday_maybe";
    // active + inbox
    return p.status === "active" || p.id === null;
  });

  const projectOptions = projects.map((p) => ({
    id: p.id,
    name: p.id === null ? "Inbox (no project)" : p.name,
  }));

  return (
    <div className="p-4 pb-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold">Tasks</h1>
        <div className="flex items-center gap-2">
          <div
            className="flex gap-1 rounded-[4px] border p-0.5"
            style={{
              background: "var(--color-paper-raised)",
              borderColor: "var(--color-line)",
            }}
          >
            {(["by_project", "all_tasks"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="font-mono rounded px-2.5 py-1 text-[11px] font-medium"
                style={{
                  background: mode === m ? "var(--color-ink)" : "transparent",
                  color:
                    mode === m ? "var(--color-paper)" : "var(--color-ink-soft)",
                }}
              >
                {m === "by_project" ? "By project" : "All tasks"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAdd((s) => !s)}
            className="font-mono flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-paper-raised)",
            }}
          >
            <Plus size={12} /> New task
          </button>
        </div>
      </div>

      {showAdd && (
        <AddTaskForm
          projects={projectOptions}
          onCancel={() => setShowAdd(false)}
          onCreated={() => setShowAdd(false)}
        />
      )}

      <SmartSearchBar
        filters={filters}
        setFilters={setFilters}
        availableTags={availableTags}
      />

      {mode === "by_project" && !active && (
        <div className="mb-3 flex gap-2">
          {(["active", "someday_maybe", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setProjectFilter(f)}
              className="font-mono rounded-full border px-3 py-1 text-[11px] font-medium"
              style={{
                borderColor:
                  projectFilter === f ? "var(--color-ink)" : "var(--color-line)",
                background: projectFilter === f ? "var(--color-ink)" : "transparent",
                color:
                  projectFilter === f
                    ? "var(--color-paper)"
                    : "var(--color-ink-soft)",
              }}
            >
              {f === "someday_maybe" ? "someday" : f}
            </button>
          ))}
        </div>
      )}

      {mode === "by_project" && !active && (
        <>
          {projectsForMode.map((p) => (
            <ProjectCard
              key={p.id ?? "inbox"}
              project={p}
              visibleTasks={p.tasks}
              defaultOpen={p.status === "active" || p.id === null}
              projects={projectOptions}
            />
          ))}
        </>
      )}

      {mode === "by_project" && active && (
        <>
          {(() => {
            const results = projects
              .map((p) => ({ p, matched: p.tasks.filter(matches) }))
              .filter((r) => r.matched.length > 0);
            if (results.length === 0) {
              return (
                <p
                  className="p-3 text-[13px]"
                  style={{ color: "var(--color-ink-soft)" }}
                >
                  No tasks match.
                </p>
              );
            }
            return results.map(({ p, matched }) => (
              <ProjectCard
                key={p.id ?? "inbox"}
                project={p}
                visibleTasks={matched}
                defaultOpen
                projects={projectOptions}
              />
            ));
          })()}
        </>
      )}

      {mode === "all_tasks" && (
        <div
          className="rounded-[4px] border p-1"
          style={{
            background: "var(--color-paper-raised)",
            borderColor: "var(--color-line)",
          }}
        >
          {(() => {
            const results = allTasksFlat.filter(matches);
            if (results.length === 0) {
              return (
                <p
                  className="p-3 text-[13px]"
                  style={{ color: "var(--color-ink-soft)" }}
                >
                  No tasks match.
                </p>
              );
            }
            return results.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                tags={t.tags.map((tg) => ({ name: tg.name }))}
                showProject
                projects={projectOptions}
              />
            ));
          })()}
        </div>
      )}
    </div>
  );
}
