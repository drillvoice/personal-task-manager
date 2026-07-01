import type { Priority } from "@/lib/types";

const styles: Record<Priority, { bg: string; fg: string }> = {
  1: { bg: "var(--color-p1-soft)", fg: "var(--color-p1)" },
  2: { bg: "var(--color-p2-soft)", fg: "var(--color-p2)" },
  3: { bg: "var(--color-p3-soft)", fg: "var(--color-p3)" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
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
