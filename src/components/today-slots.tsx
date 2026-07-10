"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { PrioritySlot } from "@/components/priority-slot";
import { PriorityBadge } from "@/components/priority-badge";
import { DueLabel } from "@/components/due-label";
import type { TodaySlot, TodayTask } from "@/lib/server/today";

export function PlanSlots({
  slots,
  pickerLabel,
  addAction,
  loadEligibleAction,
  removeAction,
  onToggleDone,
}: {
  slots: TodaySlot[];
  pickerLabel: string;
  addAction: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  loadEligibleAction: () => Promise<TodayTask[]>;
  removeAction: (id: string) => Promise<void>;
  onToggleDone?: (id: string, done: boolean) => Promise<void>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [eligible, setEligible] = useState<TodayTask[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filled = slots.filter((s) => s.task).length;
  const canAdd = filled < 3;

  const filtered = useMemo(() => {
    if (!eligible) return eligible;
    const q = query.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.projectName?.toLowerCase().includes(q) ?? false),
    );
  }, [eligible, query]);

  const openPicker = () => {
    if (!canAdd) return;
    setError(null);
    setQuery("");
    setPickerOpen(true);
    if (eligible) return;
    startTransition(async () => {
      setEligible(await loadEligibleAction());
    });
  };

  const pick = (id: string) => {
    startTransition(async () => {
      const res = await addAction(id);
      if (res.ok) {
        setEligible((prev) => prev?.filter((t) => t.id !== id) ?? null);
        // Filling this slot leaves the picker open so the remaining empty
        // slots can be filled in one go; close once this was the last one.
        const emptyBefore = slots.filter((s) => !s.task).length;
        if (emptyBefore <= 1) {
          setEligible(null);
          setQuery("");
          setPickerOpen(false);
        }
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-2">
        {slots.map((s) => (
          <PrioritySlot
            key={s.slot}
            number={s.slot}
            task={
              s.task
                ? { id: s.task.id, title: s.task.title, done: s.task.status === "done" }
                : null
            }
            onOpenPicker={openPicker}
            onRemove={removeAction}
            onToggleDone={onToggleDone}
          />
        ))}
      </div>

      {pickerOpen && canAdd && (
        <div
          className="mb-8 rounded-[4px] border p-3"
          style={{
            background: "var(--color-paper-raised)",
            borderColor: "var(--color-line)",
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <p
              className="font-mono text-[11px] font-semibold"
              style={{ color: "var(--color-ink-soft)" }}
            >
              {pickerLabel}
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="font-mono text-[11px]"
              style={{ color: "var(--color-ink-soft)" }}
            >
              Cancel
            </button>
          </div>
          {error && (
            <p
              className="font-mono mb-2 text-[11px]"
              style={{ color: "var(--color-danger)" }}
            >
              {error}
            </p>
          )}
          {eligible === null ? (
            <p
              className="font-mono text-[11px]"
              style={{ color: "var(--color-ink-soft)" }}
            >
              Loading tasks…
            </p>
          ) : eligible.length === 0 ? (
            <p
              className="font-mono text-[11px]"
              style={{ color: "var(--color-ink-soft)" }}
            >
              No open tasks. Add one in the Tasks view first.
            </p>
          ) : (
            <>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter tasks…"
                autoFocus
                className="font-mono mb-2 w-full rounded-[4px] border px-2 py-1.5 text-[12px] outline-none"
                style={{
                  background: "var(--color-paper)",
                  borderColor: "var(--color-line)",
                }}
              />
              {filtered && filtered.length === 0 ? (
                <p
                  className="font-mono py-1 text-[11px]"
                  style={{ color: "var(--color-ink-soft)" }}
                >
                  No tasks match “{query.trim()}”.
                </p>
              ) : (
                <ul className="max-h-[280px] overflow-y-auto">
                  {(filtered ?? []).map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => pick(t.id)}
                        disabled={pending}
                        className="flex w-full items-center gap-2 border-b px-1 py-2 text-left text-[13px]"
                        style={{ borderColor: "var(--color-line)" }}
                      >
                        <Plus size={12} style={{ color: "var(--color-ink-soft)" }} />
                        <span className="flex-1">{t.title}</span>
                        <PriorityBadge priority={t.priority} />
                        <DueLabel dateIso={t.dueDate} />
                        {t.projectName && (
                          <span
                            className="font-mono text-[11px]"
                            style={{ color: "var(--color-ink-soft)" }}
                          >
                            {t.projectName}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
