import "server-only";
import { and, count, eq, isNull, max } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  PRIORITY_TASK_CAP,
  WEEKLY_PRIORITY_CAP,
  dailyPlanItems,
  dailyPlans,
  weeklyPriorities,
  weeklyReviews,
} from "@/lib/db/schema";
import { weekStartIso } from "@/lib/time";

// A full cap is an ordinary validation result the caller returns to the client,
// not an exceptional condition — so this is a message, not a thrown error.
function capExceededMessage(scope: "daily" | "weekly"): string {
  return scope === "daily"
    ? `Today's plan already has ${PRIORITY_TASK_CAP} tasks — remove one first.`
    : `The weekly review already has ${WEEKLY_PRIORITY_CAP} priorities — remove one first.`;
}

/**
 * A slot reserved for one more row, or the reason there wasn't room.
 *
 * `sortOrder` is `max()+1` rather than the row count: sort_order *is* read back
 * — daily_plan_items order Today's three slots, weekly_priorities order the
 * review's top-3 — so removing a slot leaves a gap that a count-derived value
 * would collide with.
 */
export type SlotClaim =
  | { ok: true; sortOrder: number }
  | { ok: false; error: string };

/**
 * The cap decision itself, kept free of the database so it can be tested
 * directly — the two functions below differ only in which table they count.
 */
export function decideSlot(
  scope: "daily" | "weekly",
  cap: number,
  existing: { count: number; maxSortOrder: number | null },
): SlotClaim {
  if (existing.count >= cap) {
    return { ok: false, error: capExceededMessage(scope) };
  }
  return { ok: true, sortOrder: (existing.maxSortOrder ?? -1) + 1 };
}

/** Reserve a slot in a day's plan, enforcing the daily cap. */
export async function claimDailyPlanSlot(planId: string): Promise<SlotClaim> {
  const [existing] = await db
    .select({ count: count(), maxSortOrder: max(dailyPlanItems.sortOrder) })
    .from(dailyPlanItems)
    .where(eq(dailyPlanItems.dailyPlanId, planId));
  return decideSlot("daily", PRIORITY_TASK_CAP, existing);
}

/** Reserve a slot in a review's top-3, enforcing the weekly cap. */
export async function claimWeeklyPrioritySlot(
  reviewId: string,
): Promise<SlotClaim> {
  const [existing] = await db
    .select({ count: count(), maxSortOrder: max(weeklyPriorities.sortOrder) })
    .from(weeklyPriorities)
    .where(eq(weeklyPriorities.weeklyReviewId, reviewId));
  return decideSlot("weekly", WEEKLY_PRIORITY_CAP, existing);
}

/**
 * Returns the daily plan id for (user, date), creating one if none exists.
 * select → insert-on-conflict-do-nothing → re-select, so two devices hitting
 * the same fresh day concurrently both resolve to the one row instead of one
 * of them throwing a unique violation.
 */
export async function ensureDailyPlan(
  userId: string,
  dateIso: string,
): Promise<string> {
  const [existing] = await db
    .select({ id: dailyPlans.id })
    .from(dailyPlans)
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, dateIso)));
  if (existing) return existing.id;
  const [row] = await db
    .insert(dailyPlans)
    .values({ userId, date: dateIso })
    .onConflictDoNothing()
    .returning({ id: dailyPlans.id });
  if (row) return row.id;
  const [raced] = await db
    .select({ id: dailyPlans.id })
    .from(dailyPlans)
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, dateIso)));
  return raced.id;
}

/** The user's current in-progress review id, or null if none is open. */
export async function getOpenReviewId(userId: string): Promise<string | null> {
  const [existing] = await db
    .select({ id: weeklyReviews.id })
    .from(weeklyReviews)
    .where(
      and(eq(weeklyReviews.userId, userId), isNull(weeklyReviews.completedAt)),
    );
  return existing?.id ?? null;
}

/**
 * Returns the user's open review id, creating a fresh one if none is open.
 * The `wr_user_open_uniq` partial index guarantees a single open review, so
 * two concurrent creates resolve to the one row instead of one throwing.
 */
export async function ensureOpenReview(userId: string): Promise<string> {
  const existing = await getOpenReviewId(userId);
  if (existing) return existing;
  const [row] = await db
    .insert(weeklyReviews)
    .values({ userId, weekStartDate: weekStartIso() })
    .onConflictDoNothing({
      target: weeklyReviews.userId,
      where: isNull(weeklyReviews.completedAt),
    })
    .returning({ id: weeklyReviews.id });
  if (row) return row.id;
  const raced = await getOpenReviewId(userId);
  if (raced) return raced;
  throw new Error("Failed to resolve open weekly review");
}
