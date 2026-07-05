"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, isUniqueViolation } from "@/lib/db";
import { dailyPlanItems, tasks } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";
import {
  PriorityCapExceededError,
  ensureDailyPlan,
  reserveDailySlot,
} from "@/lib/server/priority-cap";
import { loadEligibleForPlan } from "@/lib/server/today";
import { todayIso, tomorrowIso } from "@/lib/time";

async function assertOwnsTask(userId: string, taskId: string) {
  const [row] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  if (!row) throw new Error("Task not found");
}

async function addToPlanForDate(
  taskId: string,
  dateIso: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  await assertOwnsTask(userId, taskId);
  const planId = await ensureDailyPlan(userId, dateIso);

  let slot: number;
  try {
    slot = await reserveDailySlot(planId);
  } catch (err) {
    if (err instanceof PriorityCapExceededError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  try {
    await db
      .insert(dailyPlanItems)
      .values({ dailyPlanId: planId, taskId, sortOrder: slot })
      // Re-adding a task already in the plan is a no-op, not an error.
      .onConflictDoNothing({
        target: [dailyPlanItems.dailyPlanId, dailyPlanItems.taskId],
      });
  } catch (err) {
    // A concurrent add took this slot first (the (plan, sort_order) unique
    // index fired). The plan state changed under us — ask the user to retry.
    if (isUniqueViolation(err)) {
      return { ok: false, error: "The plan just changed — try adding again." };
    }
    throw err;
  }
  revalidatePath("/today");
  return { ok: true };
}

async function loadEligibleForPlanDate(dateIso: string) {
  const userId = await requireUserId();
  const planId = await ensureDailyPlan(userId, dateIso);
  const planned = await db
    .select({ taskId: dailyPlanItems.taskId })
    .from(dailyPlanItems)
    .where(eq(dailyPlanItems.dailyPlanId, planId));
  return loadEligibleForPlan(
    userId,
    planned.map((item) => item.taskId),
  );
}

async function removeFromPlanForDate(taskId: string, dateIso: string) {
  const userId = await requireUserId();
  await assertOwnsTask(userId, taskId);
  const planId = await ensureDailyPlan(userId, dateIso);
  await db
    .delete(dailyPlanItems)
    .where(
      and(
        eq(dailyPlanItems.dailyPlanId, planId),
        eq(dailyPlanItems.taskId, taskId),
      ),
    );
  revalidatePath("/today");
}

export async function addToTodayPlan(taskId: string) {
  return addToPlanForDate(taskId, todayIso());
}

export async function loadEligibleForTodayPlan() {
  return loadEligibleForPlanDate(todayIso());
}

export async function removeFromTodayPlan(taskId: string) {
  return removeFromPlanForDate(taskId, todayIso());
}

export async function addToTomorrowPlan(taskId: string) {
  return addToPlanForDate(taskId, tomorrowIso());
}

export async function loadEligibleForTomorrowPlan() {
  return loadEligibleForPlanDate(tomorrowIso());
}

export async function removeFromTomorrowPlan(taskId: string) {
  return removeFromPlanForDate(taskId, tomorrowIso());
}

export async function setTaskDone(taskId: string, done: boolean) {
  const userId = await requireUserId();
  const [updated] = await db
    .update(tasks)
    .set(
      done
        ? { status: "done", completedAt: new Date() }
        : { status: "next_action", completedAt: null },
    )
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ id: tasks.id, meetingId: tasks.meetingId });
  if (!updated) throw new Error("Task not found");
  revalidatePath("/today");
  revalidatePath("/tasks");
  if (updated.meetingId) revalidatePath(`/meetings/${updated.meetingId}`);
}
