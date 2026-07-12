"use server";

import { and, count, eq, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { PRIORITY_TASK_CAP, dailyPlanItems, tasks } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";
import {
  PriorityCapExceededError,
  ensureDailyPlan,
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
  const [agg] = await db
    .select({
      count: count(),
      // sort_order isn't read anywhere today, but a removed slot leaves a
      // gap — reusing count() as the next value can collide with a slot
      // that's still in use. max()+1 always lands on an unused value.
      maxSortOrder: max(dailyPlanItems.sortOrder),
    })
    .from(dailyPlanItems)
    .where(eq(dailyPlanItems.dailyPlanId, planId));
  if (agg.count >= PRIORITY_TASK_CAP) {
    return { ok: false, error: new PriorityCapExceededError("daily").message };
  }
  await db
    .insert(dailyPlanItems)
    .values({
      dailyPlanId: planId,
      taskId,
      sortOrder: (agg.maxSortOrder ?? -1) + 1,
    })
    .onConflictDoNothing();
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

export async function setTaskDone(
  taskId: string,
  done: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  // previous_status remembers what the task was before completion so that
  // un-completing restores waiting_on/inbox instead of forcing next_action.
  // Column references in SET read the pre-update row, so this is atomic.
  const [updated] = await db
    .update(tasks)
    .set(
      done
        ? {
            status: "done",
            completedAt: new Date(),
            previousStatus: sql`case when ${tasks.status} = 'done' then ${tasks.previousStatus} else ${tasks.status} end`,
          }
        : {
            status: sql`coalesce(${tasks.previousStatus}, 'next_action')`,
            completedAt: null,
            previousStatus: null,
          },
    )
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ id: tasks.id, meetingId: tasks.meetingId });
  if (!updated) return { ok: false, error: "Task not found" };
  revalidatePath("/today");
  revalidatePath("/tasks");
  if (updated.meetingId) revalidatePath(`/meetings/${updated.meetingId}`);
  return { ok: true };
}
