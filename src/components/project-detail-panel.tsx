"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  renameProject,
  updateProjectStatus,
} from "@/app/(app)/projects/actions";
import type { ProjectsTableRow } from "@/lib/server/projects";
import { inputStyle } from "@/components/field-style";

type EditableStatus = "active" | "someday_maybe" | "archived";

const STATUSES: { value: EditableStatus; label: string }[] = [
  { value: "active", label: "active" },
  { value: "someday_maybe", label: "someday" },
  { value: "archived", label: "archived" },
];

export function ProjectDetailPanel({
  project,
  onClose,
}: {
  project: ProjectsTableRow;
  onClose: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // `on_hold` / `completed` can only arrive from outside the app; show them as
  // active rather than leaving the control with nothing selected.
  const status: EditableStatus =
    project.status === "someday_maybe" || project.status === "archived"
      ? project.status
      : "active";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
        el.blur();
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === project.name) return;
    startTransition(async () => {
      const res = await renameProject({ projectId: project.id, name: trimmed });
      setError(res.ok ? null : res.error);
    });
  };

  const setStatus = (next: EditableStatus) => {
    if (next === status) return;
    startTransition(async () => {
      const res = await updateProjectStatus({
        projectId: project.id,
        status: next,
      });
      setError(res.ok ? null : res.error);
    });
  };

  return (
    <div
      className="rounded-[4px] border p-4"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          saveName();
        }
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="font-mono text-[10px] font-semibold tracking-[0.08em] uppercase"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Project
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close project panel"
          className="-m-1 rounded p-1"
          style={{ color: "var(--color-ink-soft)" }}
        >
          <X size={16} />
        </button>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={saveName}
        placeholder="Name"
        aria-label="Project name"
        className="mb-3 w-full border p-2 text-[13px] outline-none"
        style={inputStyle}
      />

      <span
        className="font-mono mb-1.5 block text-[10px] font-semibold tracking-[0.08em] uppercase"
        style={{ color: "var(--color-ink-soft)" }}
      >
        Status
      </span>
      <div className="mb-2 flex gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatus(s.value)}
            disabled={pending}
            aria-pressed={status === s.value}
            className="font-mono rounded-full border px-3 py-1 text-[11px] font-medium"
            style={{
              borderColor:
                status === s.value ? "var(--color-ink)" : "var(--color-line)",
              background:
                status === s.value ? "var(--color-ink)" : "transparent",
              color:
                status === s.value
                  ? "var(--color-paper)"
                  : "var(--color-ink-soft)",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-[12px]" style={{ color: "var(--color-ink-soft)" }}>
        Archived projects are hidden from Tasks and the weekly Review. Assigning
        a task to one brings it back automatically.
      </p>

      {error && (
        <p
          className="font-mono mt-2 text-[11px]"
          style={{ color: "var(--color-danger)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
