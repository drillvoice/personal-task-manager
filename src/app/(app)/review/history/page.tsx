import Link from "next/link";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { tasks, weeklyPriorities, weeklyReviews } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";
import { APP_TZ, weekBeginningLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ReviewHistoryPage() {
  const userId = await requireUserId();
  const rows = await db
    .select({
      id: weeklyReviews.id,
      weekStartDate: weeklyReviews.weekStartDate,
      startedAt: weeklyReviews.startedAt,
      completedAt: weeklyReviews.completedAt,
      reflectionNotes: weeklyReviews.reflectionNotes,
    })
    .from(weeklyReviews)
    .where(eq(weeklyReviews.userId, userId))
    .orderBy(desc(weeklyReviews.weekStartDate));

  const priorityRows = rows.length
    ? await db
        .select({
          reviewId: weeklyPriorities.weeklyReviewId,
          title: tasks.title,
          done: tasks.status,
        })
        .from(weeklyPriorities)
        .innerJoin(tasks, eq(weeklyPriorities.taskId, tasks.id))
        .where(
          inArray(
            weeklyPriorities.weeklyReviewId,
            rows.map((r) => r.id),
          ),
        )
        .orderBy(asc(weeklyPriorities.sortOrder))
    : [];

  const prioritiesByReview = new Map<
    string,
    { title: string; done: boolean }[]
  >();
  for (const p of priorityRows) {
    const list = prioritiesByReview.get(p.reviewId) ?? [];
    list.push({ title: p.title, done: p.done === "done" });
    prioritiesByReview.set(p.reviewId, list);
  }

  return (
    <div className="p-4 pb-24">
      <header className="mb-4">
        <h1 className="font-display mb-1 text-xl font-bold">Review history</h1>
        <Link
          href="/review"
          className="font-mono text-[11px]"
          style={{ color: "var(--color-accent)" }}
        >
          ← current week
        </Link>
      </header>

      {rows.length === 0 && (
        <p
          className="font-mono text-[12px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          No reviews yet. Start one from the Review tab.
        </p>
      )}

      <ul className="space-y-2">
        {rows.map((r) => {
          const priorities = prioritiesByReview.get(r.id) ?? [];
          return (
            <li key={r.id}>
              <Link
                href={`/review/${r.id}`}
                className="block rounded-[4px] border p-3 transition-colors hover:border-[var(--color-ink-soft)]"
                style={{
                  background: "var(--color-paper-raised)",
                  borderColor: "var(--color-line)",
                }}
              >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-display text-[14px] font-semibold">
                  {weekBeginningLabel(r.weekStartDate)}
                </span>
                <span
                  className="font-mono text-[11px]"
                  style={{ color: "var(--color-ink-soft)" }}
                >
                  {r.completedAt
                    ? `completed ${formatInTimeZone(
                        r.completedAt,
                        APP_TZ,
                        "EEE d MMM",
                      )}`
                    : "in progress"}
                </span>
              </div>
              {priorities.length > 0 && (
                <ul className="mb-1">
                  {priorities.map((p, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 py-0.5 text-[13px]"
                    >
                      <span
                        className="font-mono text-[11px]"
                        style={{
                          color: p.done
                            ? "var(--color-teal)"
                            : "var(--color-ink-soft)",
                        }}
                      >
                        {p.done ? "✓" : "○"}
                      </span>
                      <span
                        style={{
                          color: p.done
                            ? "var(--color-ink-soft)"
                            : "var(--color-ink)",
                        }}
                      >
                        {p.title}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {r.reflectionNotes && (
                <p
                  className="text-[13px]"
                  style={{ color: "var(--color-ink)" }}
                >
                  {r.reflectionNotes}
                </p>
              )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
