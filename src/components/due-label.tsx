import { CalendarDays } from "lucide-react";
import { dueLabel, isOverdue, isToday } from "@/lib/time";

export function DueLabel({ dateIso }: { dateIso: string | null | undefined }) {
  if (!dateIso) return null;
  const label = dueLabel(dateIso);
  const urgent = isToday(dateIso) || isOverdue(dateIso);
  return (
    <span
      className="font-mono flex items-center gap-1 text-[11px] font-medium"
      style={{ color: urgent ? "var(--color-danger)" : "var(--color-ink-soft)" }}
    >
      <CalendarDays size={11} strokeWidth={2} />
      {label}
    </span>
  );
}
