"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { DueLabel } from "@/components/due-label";
import { PriorityBadge } from "@/components/priority-badge";
import { TagChip } from "@/components/tag-chip";
import { setTaskDone } from "@/app/(app)/today/actions";

export type TaskRowProps = {
  task: {
    id: string;
    title: string;
    priority: 1 | 2 | 3;
    status: "inbox" | "next_action" | "waiting_on" | "done";
    dueDate: string | null;
    projectName: string | null;
  };
  tags?: { name: string }[];
  showProject?: boolean;
};

export function TaskRow({ task, tags = [], showProject = false }: TaskRowProps) {
  const [pending, startTransition] = useTransition();
  const done = task.status === "done";

  const toggle = () => {
    startTransition(async () => {
      await setTaskDone(task.id, !done);
    });
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b px-1 py-2.5"
      style={{ borderColor: "var(--color-line)" }}
    >
      <button
        onClick={toggle}
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
      <span
        className="min-w-[120px] flex-1 text-[14px]"
        style={{
          color: done ? "var(--color-ink-soft)" : "var(--color-ink)",
          textDecoration: done ? "line-through" : "none",
        }}
      >
        {task.title}
      </span>
      {showProject && task.projectName && (
        <span
          className="font-mono text-[11px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {task.projectName}
        </span>
      )}
      <PriorityBadge priority={task.priority} />
      {task.status === "waiting_on" && <TagChip tone="accent">waiting</TagChip>}
      {tags.map((t) => (
        <TagChip key={t.name}>{t.name}</TagChip>
      ))}
      <DueLabel dateIso={task.dueDate} />
    </div>
  );
}
