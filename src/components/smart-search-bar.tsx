"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  activeProjectToken,
  extractProject,
  PROJECT_SIGIL,
  type ProjectOptionLike,
} from "@/lib/parse-project";

type Priority = 1 | 2 | 3;
type StatusFilter = "next_action" | "waiting_on" | "done";

export type SmartFilters = {
  search: string;
  priorities: Set<Priority>;
  statuses: Set<StatusFilter>;
  tags: Set<string>;
};

export function makeEmptyFilters(): SmartFilters {
  return {
    search: "",
    priorities: new Set(),
    statuses: new Set(),
    tags: new Set(),
  };
}

export function hasActiveFilters(f: SmartFilters): boolean {
  return (
    f.search.trim() !== "" ||
    f.priorities.size > 0 ||
    f.statuses.size > 0 ||
    f.tags.size > 0
  );
}

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

const STATUS_LABEL: Record<StatusFilter, string> = {
  next_action: "Next",
  waiting_on: "Waiting",
  done: "Done",
};

export type CreateResult = { ok: true } | { ok: false; error: string };

export function SmartSearchBar({
  filters,
  setFilters,
  availableTags,
  projects,
  onCreate,
}: {
  filters: SmartFilters;
  setFilters: Dispatch<SetStateAction<SmartFilters>>;
  availableTags: string[];
  projects: ProjectOptionLike[];
  onCreate: (title: string, projectId: string | null) => Promise<CreateResult>;
}) {
  const active = hasActiveFilters(filters);
  const [caret, setCaret] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [status, setStatus] = useState<
    { kind: "added"; project: string } | { kind: "error"; message: string } | null
  >(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    },
    [],
  );

  const clear = () => {
    setFilters({
      search: "",
      priorities: new Set(),
      statuses: new Set(),
      tags: new Set(),
    });
    setStatus(null);
  };

  const rawToken = pickerOpen ? activeProjectToken(filters.search, caret) : null;
  // A token starting with whitespace is arithmetic or stray punctuation
  // ("2 ^ 3"), not a project reference — never hijack Enter for those.
  const token =
    rawToken && rawToken.query === rawToken.query.trimStart() ? rawToken : null;
  const tokenQuery = token?.query.trim().toLowerCase() ?? "";
  const suggestions = token
    ? projects.filter(
        (p) => tokenQuery === "" || p.name.toLowerCase().includes(tokenQuery),
      )
    : [];
  const showPicker = suggestions.length > 0;

  const resolved = extractProject(filters.search, projects);
  const resolvedProject = resolved.projectId
    ? (projects.find((p) => p.id === resolved.projectId)?.name ?? "Inbox")
    : "Inbox";

  const syncCaret = (el: HTMLInputElement) => setCaret(el.selectionStart ?? 0);

  const applyProject = (project: ProjectOptionLike) => {
    if (!token) return;
    const before = filters.search.slice(0, token.start);
    const after = filters.search.slice(token.end);
    const inserted = `${PROJECT_SIGIL}${project.name} `;
    const next = before + inserted + after.replace(/^\s+/, "");
    const nextCaret = before.length + inserted.length;
    setFilters((f) => ({ ...f, search: next }));
    setPickerOpen(false);
    setHighlight(0);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
      setCaret(nextCaret);
    });
  };

  const submit = async () => {
    const { title, projectId, projectOnly } = resolved;
    if (!title || projectOnly) return;
    const projectName = resolvedProject;
    const res = await onCreate(title, projectId);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    if (res.ok) {
      setFilters((f) => ({ ...f, search: "" }));
      setCaret(0);
      setStatus({ kind: "added", project: projectName });
      statusTimer.current = setTimeout(() => setStatus(null), 2500);
    } else {
      setStatus({ kind: "error", message: res.error });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setPickerOpen(false);
      return;
    }
    if (showPicker && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setHighlight((h) =>
        e.key === "ArrowDown"
          ? Math.min(h + 1, suggestions.length - 1)
          : Math.max(h - 1, 0),
      );
      return;
    }
    if (showPicker && (e.key === "Enter" || e.key === "Tab")) {
      e.preventDefault();
      const choice = suggestions[highlight] ?? suggestions[0];
      if (choice) applyProject(choice);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  };

  const hint =
    status?.kind === "error"
      ? status.message
      : status?.kind === "added"
        ? `Added to ${status.project} ✓`
        : resolved.projectOnly
          ? `Type the task for ${resolvedProject}, then ⏎`
          : filters.search.trim()
            ? `⏎ adds to ${resolvedProject} · ^project, #tag, or a due date like 'in 3 days'`
            : null;

  return (
    <div className="mb-3">
      <div className="relative mb-2">
        {showPicker && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setPickerOpen(false)}
          />
        )}
        <div
          className="relative z-20 flex items-center gap-2 rounded-[4px] border px-3 py-2"
          style={{
            background: "var(--color-paper-raised)",
            borderColor: "var(--color-line)",
          }}
        >
          <Search size={14} style={{ color: "var(--color-ink-soft)" }} />
          <input
            ref={inputRef}
            value={filters.search}
            onChange={(e) => {
              setFilters((f) => ({ ...f, search: e.target.value }));
              syncCaret(e.currentTarget);
              setPickerOpen(true);
              setHighlight(0);
              setStatus(null);
            }}
            onKeyUp={(e) => syncCaret(e.currentTarget)}
            onClick={(e) => syncCaret(e.currentTarget)}
            onBlur={() => setPickerOpen(false)}
            onKeyDown={onKeyDown}
            placeholder="Search tasks, or press ⏎ to add one…"
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: "var(--color-ink)" }}
          />
          {active && (
            <button
              type="button"
              onClick={clear}
              className="font-mono text-[11px]"
              style={{ color: "var(--color-ink-soft)" }}
            >
              Clear
            </button>
          )}
        </div>

        {showPicker && (
          <div
            className="gtd-scrollbar absolute top-full right-0 left-0 z-30 mt-0.5 max-h-[240px] overflow-y-auto rounded-[4px] border"
            style={{
              background: "var(--color-paper-raised)",
              borderColor: "var(--color-line)",
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {suggestions.map((p, i) => (
              <button
                key={p.id}
                type="button"
                tabIndex={-1}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => applyProject(p)}
                className="block w-full px-3 py-2 text-left text-[13px]"
                style={{
                  background:
                    i === highlight ? "var(--color-paper)" : "transparent",
                  color: "var(--color-ink)",
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {hint && (
        <p
          className="font-mono -mt-1 mb-2 text-[10px]"
          style={{
            color:
              status?.kind === "error"
                ? "var(--color-danger)"
                : "var(--color-ink-soft)",
          }}
        >
          {hint}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {[1, 2, 3].map((p) => {
          const on = filters.priorities.has(p as Priority);
          return (
            <button
              key={p}
              type="button"
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  priorities: toggleInSet(f.priorities, p as Priority),
                }))
              }
              className="font-mono rounded-full border px-2.5 py-1 text-[11px] font-semibold"
              style={{
                borderColor: on ? `var(--color-p${p})` : "var(--color-line)",
                background: on ? `var(--color-p${p})` : `var(--color-p${p}-soft)`,
                color: on ? "var(--color-paper-raised)" : `var(--color-p${p})`,
              }}
            >
              P{p}
            </button>
          );
        })}

        <span
          className="mx-1"
          style={{ width: 1, height: 16, background: "var(--color-line)" }}
        />

        {(Object.entries(STATUS_LABEL) as [StatusFilter, string][]).map(
          ([value, label]) => {
            const on = filters.statuses.has(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    statuses: toggleInSet(f.statuses, value),
                  }))
                }
                className="font-mono rounded-full border px-2.5 py-1 text-[11px] font-medium"
                style={{
                  borderColor: on ? "var(--color-ink)" : "var(--color-line)",
                  background: on ? "var(--color-ink)" : "transparent",
                  color: on ? "var(--color-paper)" : "var(--color-ink-soft)",
                }}
              >
                {label}
              </button>
            );
          },
        )}

        {availableTags.length > 0 && (
          <>
            <span
              className="mx-1"
              style={{ width: 1, height: 16, background: "var(--color-line)" }}
            />
            {availableTags.map((tag) => {
              const on = filters.tags.has(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      tags: toggleInSet(f.tags, tag),
                    }))
                  }
                  className="font-mono rounded-full border px-2.5 py-1 text-[11px] font-medium"
                  style={{
                    borderColor: on ? "var(--color-teal)" : "var(--color-line)",
                    background: on ? "var(--color-teal)" : "transparent",
                    color: on ? "var(--color-paper)" : "var(--color-ink-soft)",
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
