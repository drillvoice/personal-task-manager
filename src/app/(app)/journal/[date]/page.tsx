import { notFound } from "next/navigation";
import { JournalDayNav } from "@/components/journal-day-nav";
import { JournalView } from "@/components/journal-view";
import { requireUserId } from "@/lib/server/session";
import { loadJournalEntry, loadJournalRefOptions } from "@/lib/server/journal";
import { addDaysIso, formatDateIso, todayIso } from "@/lib/time";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function JournalDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00`))) {
    notFound();
  }

  const userId = await requireUserId();
  const [entry, refOptions] = await Promise.all([
    loadJournalEntry(userId, date),
    loadJournalRefOptions(userId),
  ]);

  const today = todayIso();
  const isToday = date === today;
  const heading = formatDateIso(date, "EEEE, d MMMM yyyy");

  return (
    <div className="p-4">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className="font-mono mb-1 text-[11px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            {isToday ? "Today" : "Journal"}
          </p>
          <h1 className="font-display text-xl font-bold">{heading}</h1>
        </div>
        <JournalDayNav
          date={date}
          prevDate={addDaysIso(date, -1)}
          nextDate={addDaysIso(date, 1)}
          todayDate={today}
          isToday={isToday}
        />
      </header>

      <JournalView
        date={date}
        body={entry.body}
        people={refOptions.people}
        tags={refOptions.tags}
        initialMode={isToday ? "edit" : "read"}
      />
    </div>
  );
}
