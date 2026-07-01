"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddProjectForm } from "@/components/add-project-form";
import type { ProjectsTableData } from "@/lib/server/projects";

export function ProjectsTable({ data }: { data: ProjectsTableData }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);

  const toggle = (k: string) => setExpanded((e) => ({ ...e, [k]: !e[k] }));

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
        Scroll right for a project&rsquo;s history over time. Scroll down for a
        snapshot of everything, one week. Click a cell to expand it.{" "}
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
          maxHeight: 480,
        }}
      >
        <table className="gtd-history-table w-full text-[13px]">
          <thead>
            <tr>
              <th
                className="font-display sticky left-0 top-0 z-20 px-3 py-2 text-left text-[13px] font-semibold"
                style={{
                  background: "var(--color-paper-raised)",
                  minWidth: 220,
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
                    minWidth: 200,
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
                  className="font-display sticky left-0 z-10 px-3 py-2.5 text-[13px] font-semibold"
                  style={{ background: "var(--color-paper-raised)" }}
                >
                  {row.name}
                </td>
                {data.weeks.map((w) => {
                  const key = `${row.id}-${w.start}`;
                  const note = row.notesByWeek[w.start] || "—";
                  return (
                    <td
                      key={key}
                      onClick={() => toggle(key)}
                      className="px-3 py-2.5 align-top"
                      style={{
                        background: w.isCurrent
                          ? "var(--color-accent-soft)"
                          : "transparent",
                        color:
                          note === "—"
                            ? "var(--color-ink-soft)"
                            : "var(--color-ink)",
                      }}
                    >
                      <span
                        className={`gtd-hcell ${expanded[key] ? "expanded" : ""}`}
                      >
                        {note}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
