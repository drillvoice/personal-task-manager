"use client";

import { useTransition } from "react";
import { Plus, X } from "lucide-react";
import { removeFromTodayPlan } from "@/app/(app)/today/actions";

type Task = {
  id: string;
  title: string;
};

export function PrioritySlot({
  number,
  task,
  onOpenPicker,
}: {
  number: 1 | 2 | 3;
  task: Task | null;
  onOpenPicker: () => void;
}) {
  const [pending, startTransition] = useTransition();

  if (!task) {
    return (
      <button
        type="button"
        onClick={onOpenPicker}
        className="flex min-h-[110px] min-w-[140px] flex-1 flex-col items-center justify-center gap-2 rounded-[4px] p-4"
        style={{ border: "1.5px dashed var(--color-line)" }}
      >
        <span
          className="font-display text-2xl font-bold"
          style={{ color: "var(--color-line)" }}
        >
          {number}
        </span>
        <span
          className="font-mono flex items-center gap-1 text-[11px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          <Plus size={12} /> open slot
        </span>
      </button>
    );
  }

  return (
    <div
      className="flex min-h-[110px] min-w-[140px] flex-1 flex-col justify-between rounded-[4px] p-4"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-accent)",
        borderWidth: 1.5,
        borderStyle: "solid",
      }}
    >
      <div className="flex items-start justify-between">
        <span
          className="font-display text-2xl font-bold"
          style={{ color: "var(--color-accent)" }}
        >
          {number}
        </span>
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await removeFromTodayPlan(task.id);
            })
          }
          disabled={pending}
          aria-label={`Remove slot ${number}`}
          style={{ color: "var(--color-ink-soft)" }}
        >
          <X size={14} />
        </button>
      </div>
      <span className="text-[14px] font-medium leading-tight">{task.title}</span>
    </div>
  );
}
