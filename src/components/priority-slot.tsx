"use client";

import { useTransition } from "react";
import { Check, Plus, X } from "lucide-react";

type Task = {
  id: string;
  title: string;
  done: boolean;
};

export function PrioritySlot({
  number,
  task,
  onOpenPicker,
  onRemove,
  onToggleDone,
}: {
  number: 1 | 2 | 3;
  task: Task | null;
  onOpenPicker: () => void;
  onRemove: (id: string) => Promise<void>;
  onToggleDone?: (id: string, done: boolean) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  if (!task) {
    return (
      <button
        type="button"
        onClick={onOpenPicker}
        className="flex w-full items-center gap-3 rounded-[4px] px-4 py-3"
        style={{ border: "1.5px dashed var(--color-line)" }}
      >
        <span
          className="font-display text-2xl font-bold w-6 shrink-0"
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

  const { done } = task;

  return (
    <div
      className="flex w-full items-center gap-3 rounded-[4px] px-4 py-3"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: done ? "var(--color-teal)" : "var(--color-accent)",
        borderWidth: 1.5,
        borderStyle: "solid",
      }}
    >
      <span
        className="font-display text-2xl font-bold w-6 shrink-0"
        style={{ color: done ? "var(--color-teal)" : "var(--color-accent)" }}
      >
        {number}
      </span>
      {onToggleDone && (
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await onToggleDone(task.id, !done);
            })
          }
          disabled={pending}
          aria-pressed={done}
          aria-label={done ? "Mark task incomplete" : "Mark task complete"}
          className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px]"
          style={{
            background: done ? "var(--color-teal)" : "transparent",
            borderColor: done ? "var(--color-teal)" : "var(--color-ink-soft)",
          }}
        >
          {done && <Check size={12} color="var(--color-paper-raised)" strokeWidth={3} />}
        </button>
      )}
      <span
        className="flex-1 text-[14px] font-medium leading-tight"
        style={{
          color: onToggleDone && done ? "var(--color-ink-soft)" : "var(--color-ink)",
          textDecoration: onToggleDone && done ? "line-through" : "none",
        }}
      >
        {task.title}
      </span>
      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            await onRemove(task.id);
          })
        }
        disabled={pending}
        aria-label={`Remove slot ${number}`}
        style={{ color: "var(--color-ink-soft)" }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
