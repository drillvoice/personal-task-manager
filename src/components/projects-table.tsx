"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Plus } from "lucide-react";
import { upsertWeeklyNote } from "@/app/(app)/projects/actions";
import { ProjectDetailPanel } from "@/components/project-detail-panel";
import { useIsDesktop } from "@/components/use-is-desktop";
import type { ProjectsTableData } from "@/lib/server/projects";

const AddProjectForm = dynamic(() =>
  import("@/components/add-project-form").then((mod) => mod.AddProjectForm),
);

export function ProjectsTable({
  data,
  includeArchived,
}: {
  data: ProjectsTableData;
  includeArchived: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const isDesktop = useIsDesktop();

  // Derived from server data, so archiving the selected project out of view
  // (or deleting it) closes the panel on revalidation.
  const selectedProject =
    selectedProjectId !== null
      ? (data.rows.find((r) => r.id === selectedProjectId) ?? null)
      : null;

  // Read the *resolved* project's id downstream, never the raw state: a
  // project archived out of view resolves to null, so its id can't linger and
  // read as "already selected" against the toggle below.
  const activeProjectId = selectedProject?.id ?? null;

  const onSelectProject = isDesktop
    ? (id: string) => setSelectedProjectId(activeProjectId === id ? null : id)
    : undefined;

  return (
    <div className="px-4 py-6 md:grid md:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] md:items-start md:gap-6">
      <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold">Project overview</h1>
        <div className="flex items-center gap-2">
          {(data.hasArchived || includeArchived) && (
            <Link
              href={includeArchived ? "/projects" : "/projects?archived=1"}
              className="font-mono rounded-full border px-3 py-1 text-[11px] font-medium"
              style={{
                borderColor: includeArchived
                  ? "var(--color-ink)"
                  : "var(--color-line)",
                background: includeArchived
                  ? "var(--color-ink)"
                  : "transparent",
                color: includeArchived
                  ? "var(--color-paper)"
                  : "var(--color-ink-soft)",
              }}
            >
              Show archived
            </Link>
          )}
          <button
            type="button"
            onClick={() => setShowAdd((s) => !s)}
            className="font-mono flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold bg-accent text-paper-raised"
          >
            <Plus size={12} /> New project
          </button>
        </div>
      </div>
      <p
        className="mb-4 text-[13px] text-ink-soft"
      >
        Click a cell to write the week&rsquo;s update — it saves when you
        click away. Columns fill in as you add notes across weeks.
      </p>

      {showAdd && (
        <AddProjectForm
          onCancel={() => setShowAdd(false)}
          onCreated={() => setShowAdd(false)}
        />
      )}

      <div
        className="gtd-scrollbar overflow-x-auto rounded-card border bg-paper-raised border-line"
      >
        <table className="gtd-history-table w-full text-[13px]">
          <thead>
            <tr>
              <th
                className="font-display sticky left-0 top-0 z-20 whitespace-nowrap px-3 py-2 text-left text-[13px] font-semibold bg-paper-raised"
                style={{ width: "1%",
                  maxWidth: 220 }}
              >
                Project
              </th>
              {data.weeks.map((w) => (
                <th
                  key={w.start}
                  className="font-mono sticky top-0 z-10 px-3 py-2 text-left text-[11px] font-semibold"
                  style={{
                    background: w.isCurrent
                      ? "var(--color-accent-soft)"
                      : "var(--color-paper-raised)",
                    color: w.isCurrent
                      ? "var(--color-accent)"
                      : "var(--color-ink-soft)",
                    minWidth: 220,
                  }}
                >
                  {w.label}
                  {w.isCurrent ? " · current" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr>
                <td
                  colSpan={data.weeks.length + 1}
                  className="px-3 py-6 text-center text-[13px] text-ink-soft"
                >
                  No projects yet. Add one to start tracking weekly context.
                </td>
              </tr>
            )}
            {data.rows.map((row) => (
              <tr key={row.id}>
                <td
                  className="font-display sticky left-0 z-10 max-w-[220px] px-3 py-2.5 align-top text-[13px] font-semibold"
                  style={{
                    background:
                      row.id === activeProjectId
                        ? "var(--color-accent-soft)"
                        : "var(--color-paper-raised)",
                  }}
                  title={row.name}
                >
                  <button
                    type="button"
                    onClick={
                      onSelectProject
                        ? () => onSelectProject(row.id)
                        : undefined
                    }
                    aria-pressed={row.id === activeProjectId}
                    className="block max-w-full truncate text-left"
                    style={{
                      color:
                        row.status === "archived"
                          ? "var(--color-ink-soft)"
                          : "var(--color-ink)",
                      cursor: onSelectProject ? "pointer" : "default",
                    }}
                  >
                    {row.name}
                    {row.status === "archived" && (
                      <span
                        className="font-mono ml-1.5 text-[10px] font-medium text-ink-soft"
                      >
                        archived
                      </span>
                    )}
                  </button>
                </td>
                {data.weeks.map((w) => (
                  <NoteCell
                    key={`${row.id}-${w.start}`}
                    projectId={row.id}
                    weekStart={w.start}
                    initialNote={row.notesByWeek[w.start] ?? ""}
                    isCurrent={w.isCurrent}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      <div className="hidden md:sticky md:top-4 md:block md:max-h-[calc(100vh-2rem)] md:min-w-0 md:overflow-y-auto">
        {selectedProject ? (
          <ProjectDetailPanel
            key={selectedProject.id}
            project={selectedProject}
            onClose={() => setSelectedProjectId(null)}
          />
        ) : (
          <div
            className="font-mono flex min-h-[220px] items-center justify-center rounded-card border border-dashed text-[11px] border-line text-ink-soft"
          >
            Select a project
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCell({
  projectId,
  weekStart,
  initialNote,
  isCurrent,
}: {
  projectId: string;
  weekStart: string;
  initialNote: string;
  isCurrent: boolean;
}) {
  const [value, setValue] = useState(initialNote);
  const [saved, setSaved] = useState<string>(initialNote);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(resize, [value]);

  const save = () => {
    if (value === saved) return;
    startTransition(async () => {
      const res = await upsertWeeklyNote({
        projectId,
        weekStartDate: weekStart,
        note: value,
      });
      if (res.ok) {
        setSaved(value);
        setError(null);
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <td
      className="px-2 py-1.5 align-top"
      style={{
        background: isCurrent ? "var(--color-accent-soft)" : "transparent",
        minWidth: 220,
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        rows={1}
        placeholder={isCurrent ? "Write this week's update…" : "—"}
        className="w-full resize-none overflow-hidden bg-transparent p-1.5 text-[13px] outline-none"
        style={{
          border: "1px solid transparent",
          color:
            value.trim() === "" && !isCurrent
              ? "var(--color-ink-soft)"
              : "var(--color-ink)",
          minHeight: 60,
        }}
        onFocus={(e) => {
          e.currentTarget.style.border = "1px solid var(--color-line)";
        }}
        onBlurCapture={(e) => {
          e.currentTarget.style.border = "1px solid transparent";
        }}
      />
      {error ? (
        <p
          className="font-mono px-1.5 text-[10px] text-danger"
        >
          {error}
        </p>
      ) : (
        <p
          className="font-mono px-1.5 text-[10px] text-ink-soft"
          style={{ opacity: pending ? 1 : 0,
            transition: "opacity 150ms" }}
        >
          {pending ? "saving…" : " "}
        </p>
      )}
    </td>
  );
}
