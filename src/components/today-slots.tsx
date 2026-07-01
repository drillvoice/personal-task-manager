"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { PrioritySlot } from "@/components/priority-slot";
import { PriorityBadge } from "@/components/priority-badge";
import { DueLabel } from "@/components/due-label";
import { addToTodayPlan } from "@/app/(app)/today/actions";
import type { TodaySlot, TodayTask } from "@/lib/server/today";

export function TodaySlots({
  slots,
  eligible,
}: {
  slots: TodaySlot[];
  eligible: TodayTask[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filled = slots.filter((s) => s.task).length;
  const canAdd = filled < 3;

  const openPicker = () => {
    if (!canAdd) return;
    setError(null);
    setPickerOpen(true);
  };

  const pick = (id: string) => {
    startTransition(async () => {
      const res = await addToTodayPlan(id);
      if (res.ok) {
        setPickerOpen(false);
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <>
      <div className="mb-4 flex gap-3">
        {slots.map((s) => (
          <PrioritySlot
            key={s.slot}
            number={s.slot}
            task={s.task ? { id: s.task.id, title: s.task.title } : null}
            onOpenPicker={openPicker}
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
              PICK ONE FOR TODAY
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
          {eligible.length === 0 ? (
            <p
              className="font-mono text-[11px]"
              style={{ color: "var(--color-ink-soft)" }}
            >
              No open tasks. Add one in the Tasks view first.
            </p>
          ) : (
            <ul className="max-h-[280px] overflow-y-auto">
              {eligible.map((t) => (
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
        </div>
      )}
    </>
  );
}
