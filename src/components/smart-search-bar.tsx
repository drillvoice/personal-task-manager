"use client";

import { Search } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

type Priority = 1 | 2 | 3;
type StatusFilter = "next_action" | "waiting_on";

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
};

export function SmartSearchBar({
  filters,
  setFilters,
  availableTags,
}: {
  filters: SmartFilters;
  setFilters: Dispatch<SetStateAction<SmartFilters>>;
  availableTags: string[];
}) {
  const active = hasActiveFilters(filters);

  const clear = () =>
    setFilters({
      search: "",
      priorities: new Set(),
      statuses: new Set(),
      tags: new Set(),
    });

  return (
    <div className="mb-3">
      <div
        className="mb-2 flex items-center gap-2 rounded-[4px] border px-3 py-2"
        style={{
          background: "var(--color-paper-raised)",
          borderColor: "var(--color-line)",
        }}
      >
        <Search size={14} style={{ color: "var(--color-ink-soft)" }} />
        <input
          value={filters.search}
          onChange={(e) =>
            setFilters((f) => ({ ...f, search: e.target.value }))
          }
          placeholder="Search tasks, or filter by chip below…"
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
