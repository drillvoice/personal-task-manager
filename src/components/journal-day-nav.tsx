"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function JournalDayNav({
  date,
  prevDate,
  nextDate,
  todayDate,
  isToday,
}: {
  date: string;
  prevDate: string;
  nextDate: string;
  todayDate: string;
  isToday: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={`/journal/${prevDate}`}
        aria-label="Previous day"
        className="rounded-[4px] border p-1.5"
        style={{ borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }}
      >
        <ChevronLeft size={16} />
      </Link>
      <input
        type="date"
        value={date}
        onChange={(e) => {
          if (e.target.value) router.push(`/journal/${e.target.value}`);
        }}
        className="font-mono rounded-[4px] border px-2 py-1 text-[12px] outline-none"
        style={{
          background: "var(--color-paper-raised)",
          borderColor: "var(--color-line)",
          color: "var(--color-ink)",
        }}
      />
      <Link
        href={`/journal/${nextDate}`}
        aria-label="Next day"
        className="rounded-[4px] border p-1.5"
        style={{ borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }}
      >
        <ChevronRight size={16} />
      </Link>
      {!isToday && (
        <Link
          href={`/journal/${todayDate}`}
          className="font-mono ml-1 rounded-[4px] border px-2 py-1 text-[11px]"
          style={{
            borderColor: "var(--color-line)",
            color: "var(--color-accent)",
          }}
        >
          Today
        </Link>
      )}
    </div>
  );
}
