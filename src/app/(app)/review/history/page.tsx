import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { weeklyReviews } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";
import { APP_TZ, weekLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ReviewHistoryPage() {
  const userId = await requireUserId();
  const rows = await db
    .select({
      weekStartDate: weeklyReviews.weekStartDate,
      startedAt: weeklyReviews.startedAt,
      completedAt: weeklyReviews.completedAt,
      reflectionNotes: weeklyReviews.reflectionNotes,
    })
    .from(weeklyReviews)
    .where(eq(weeklyReviews.userId, userId))
    .orderBy(desc(weeklyReviews.weekStartDate));

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
        {rows.map((r) => (
          <li
            key={r.weekStartDate}
            className="rounded-[4px] border p-3"
            style={{
              background: "var(--color-paper-raised)",
              borderColor: "var(--color-line)",
            }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-display text-[14px] font-semibold">
                Week of {weekLabel(r.weekStartDate)}
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
            {r.reflectionNotes && (
              <p
                className="text-[13px]"
                style={{ color: "var(--color-ink)" }}
              >
                {r.reflectionNotes}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
