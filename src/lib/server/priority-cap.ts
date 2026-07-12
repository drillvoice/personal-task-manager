import "server-only";
import { and, count, eq, isNull } from "drizzle-orm";
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
