import type { Priority } from "@/lib/types";

const styles: Record<Priority, { bg: string; fg: string }> = {
  1: { bg: "var(--color-p1-soft)", fg: "var(--color-p1)" },
  2: { bg: "var(--color-p2-soft)", fg: "var(--color-p2)" },
  3: { bg: "var(--color-p3-soft)", fg: "var(--color-p3)" },
};

/**
 * Priority is a p1/p2/p3 tag, not a required field — a task with none of
 * those tags has no priority signal and renders no badge.
 */
export function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (priority === null) return null;
  const { bg, fg } = styles[priority];
  return (
    <span
      className="font-mono rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: bg, color: fg }}
    >
      P{priority}
    </span>
  );
}
