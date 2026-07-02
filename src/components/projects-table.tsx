"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { upsertWeeklyNote } from "@/app/(app)/projects/actions";
import type { ProjectsTableData } from "@/lib/server/projects";

const AddProjectForm = dynamic(() =>
  import("@/components/add-project-form").then((mod) => mod.AddProjectForm),
);

export function ProjectsTable({ data }: { data: ProjectsTableData }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="p-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold">Projects</h1>
        <button
          type="button"
          onClick={() => setShowAdd((s) => !s)}
          className="font-mono flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold"
          style={{
            background: "var(--color-accent)",
            color: "var(--color-paper-raised)",
          }}
        >
          <Plus size={12} /> New project
        </button>
      </div>
      <p
        className="mb-4 text-[13px]"
        style={{ color: "var(--color-ink-soft)" }}
      >
        Click a cell to write the week&rsquo;s update — it saves when you
        click away. Columns fill in as you add notes across weeks.{" "}
        <span className="font-mono">
          (Desktop-oriented view — not optimised for mobile.)
        </span>
      </p>

      {showAdd && (
        <AddProjectForm
          onCancel={() => setShowAdd(false)}
          onCreated={() => setShowAdd(false)}
        />
      )}

      <div
        className="gtd-scrollbar overflow-auto rounded-[4px] border"
        style={{
          background: "var(--color-paper-raised)",
          borderColor: "var(--color-line)",
          maxHeight: 560,
        }}
      >
        <table className="gtd-history-table w-full text-[13px]">
          <thead>
            <tr>
              <th
                className="font-display sticky left-0 top-0 z-20 whitespace-nowrap px-3 py-2 text-left text-[13px] font-semibold"
                style={{
                  background: "var(--color-paper-raised)",
                  width: "1%",
                  maxWidth: 220,
                }}
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
                  className="px-3 py-6 text-center text-[13px]"
                  style={{ color: "var(--color-ink-soft)" }}
                >
                  No projects yet. Add one to start tracking weekly context.
                </td>
              </tr>
            )}
            {data.rows.map((row) => (
              <tr key={row.id}>
                <td
                  className="font-display sticky left-0 z-10 max-w-[220px] truncate px-3 py-2.5 align-top text-[13px] font-semibold"
                  style={{ background: "var(--color-paper-raised)" }}
                  title={row.name}
                >
                  {row.name}
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
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        rows={3}
        placeholder={isCurrent ? "Write this week's update…" : "—"}
        className="w-full resize-y bg-transparent p-1.5 text-[13px] outline-none"
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
          className="font-mono px-1.5 text-[10px]"
          style={{ color: "var(--color-danger)" }}
        >
          {error}
        </p>
      ) : (
        <p
          className="font-mono px-1.5 text-[10px]"
          style={{
            color: "var(--color-ink-soft)",
            opacity: pending ? 1 : 0,
            transition: "opacity 150ms",
          }}
        >
          {pending ? "saving…" : " "}
        </p>
      )}
    </td>
  );
}
