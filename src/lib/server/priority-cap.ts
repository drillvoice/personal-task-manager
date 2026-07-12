import "server-only";
import { and, count, eq } from "drizzle-orm";
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

export async function assertDailyRoomForOne(planId: string): Promise<void> {
  const [existing] = await db
    .select({ value: count() })
    .from(dailyPlanItems)
    .where(eq(dailyPlanItems.dailyPlanId, planId));
  if (existing.value >= PRIORITY_TASK_CAP) {
    throw new PriorityCapExceededError("daily");
  }
}

export async function assertWeeklyRoomForOne(reviewId: string): Promise<void> {
  const [existing] = await db
    .select({ value: count() })
    .from(weeklyPriorities)
    .where(eq(weeklyPriorities.weeklyReviewId, reviewId));
  if (existing.value >= WEEKLY_PRIORITY_CAP) {
    throw new PriorityCapExceededError("weekly");
  }
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

/** Returns the open review id for (user, week), creating one if none exists. */
export async function ensureWeeklyReview(
  userId: string,
  weekStartIsoDate: string,
): Promise<string> {
  const where = and(
    eq(weeklyReviews.userId, userId),
    eq(weeklyReviews.weekStartDate, weekStartIsoDate),
  );
  const [existing] = await db
    .select({ id: weeklyReviews.id })
    .from(weeklyReviews)
    .where(where);
  if (existing) return existing.id;
  const [row] = await db
    .insert(weeklyReviews)
    .values({ userId, weekStartDate: weekStartIsoDate })
    .onConflictDoNothing()
    .returning({ id: weeklyReviews.id });
  if (row) return row.id;
  const [raced] = await db
    .select({ id: weeklyReviews.id })
    .from(weeklyReviews)
    .where(where);
  return raced.id;
}
