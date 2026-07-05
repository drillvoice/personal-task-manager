import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  PRIORITY_TASK_CAP,
  WEEKLY_PRIORITY_CAP,
  dailyPlanItems,
  dailyPlans,
  weeklyPriorities,
  weeklyReviews,
} from "@/lib/db/schema";

/**
 * Guards the "exactly 3" cap on today's priority slots. Callers should catch
 * PriorityCapExceededError and surface it as a validation error to the client.
 */
export class PriorityCapExceededError extends Error {
  constructor(scope: "daily" | "weekly") {
    super(
      scope === "daily"
        ? `Today's plan already has ${PRIORITY_TASK_CAP} tasks — remove one first.`
        : `The weekly review already has ${WEEKLY_PRIORITY_CAP} priorities — remove one first.`,
    );
    this.name = "PriorityCapExceededError";
  }
}

/**
 * Lowest free slot index in [0, cap) given the slots already taken. Filling
 * gaps (rather than appending at `count`) keeps slot identity stable when a
 * middle slot is removed, and pairs with the `(parent, sort_order)` unique
 * index so a lost insert race throws instead of overflowing the cap.
 */
function nextFreeSlot(
  taken: number[],
  scope: "daily" | "weekly",
): number {
  const cap = scope === "daily" ? PRIORITY_TASK_CAP : WEEKLY_PRIORITY_CAP;
  for (let slot = 0; slot < cap; slot++) {
    if (!taken.includes(slot)) return slot;
  }
  throw new PriorityCapExceededError(scope);
}

export async function reserveDailySlot(planId: string): Promise<number> {
  const rows = await db
    .select({ sortOrder: dailyPlanItems.sortOrder })
    .from(dailyPlanItems)
    .where(eq(dailyPlanItems.dailyPlanId, planId));
  return nextFreeSlot(
    rows.map((r) => r.sortOrder),
    "daily",
  );
}

export async function reserveWeeklySlot(reviewId: string): Promise<number> {
  const rows = await db
    .select({ sortOrder: weeklyPriorities.sortOrder })
    .from(weeklyPriorities)
    .where(eq(weeklyPriorities.weeklyReviewId, reviewId));
  return nextFreeSlot(
    rows.map((r) => r.sortOrder),
    "weekly",
  );
}

/** Returns the daily plan id for (user, date), creating one if none exists. */
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
    .returning({ id: dailyPlans.id });
  return row.id;
}

/** Returns the open review id for (user, week), creating one if none exists. */
export async function ensureWeeklyReview(
  userId: string,
  weekStartIsoDate: string,
): Promise<string> {
  const [existing] = await db
    .select({ id: weeklyReviews.id })
    .from(weeklyReviews)
    .where(
      and(
        eq(weeklyReviews.userId, userId),
        eq(weeklyReviews.weekStartDate, weekStartIsoDate),
      ),
    );
  if (existing) return existing.id;
  const [row] = await db
    .insert(weeklyReviews)
    .values({ userId, weekStartDate: weekStartIsoDate })
    .returning({ id: weeklyReviews.id });
  return row.id;
}
