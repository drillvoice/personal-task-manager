"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { PRIORITY_TASK_CAP, dailyPlanItems, tasks } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";
import {
  PriorityCapExceededError,
  ensureDailyPlan,
} from "@/lib/server/priority-cap";
import { loadEligibleForPlan } from "@/lib/server/today";
import { todayIso } from "@/lib/time";

async function assertOwnsTask(userId: string, taskId: string) {
  const [row] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  if (!row) throw new Error("Task not found");
}

export async function addToTodayPlan(taskId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const userId = await requireUserId();
  await assertOwnsTask(userId, taskId);
  const planId = await ensureDailyPlan(userId, todayIso());
  const [existing] = await db
    .select({ value: count() })
    .from(dailyPlanItems)
    .where(eq(dailyPlanItems.dailyPlanId, planId));
  if (existing.value >= PRIORITY_TASK_CAP) {
    return { ok: false, error: new PriorityCapExceededError("daily").message };
  }
  await db
    .insert(dailyPlanItems)
    .values({ dailyPlanId: planId, taskId, sortOrder: existing.value })
    .onConflictDoNothing();
  revalidatePath("/today");
  return { ok: true };
}

export async function loadEligibleForTodayPlan() {
  const userId = await requireUserId();
  const planId = await ensureDailyPlan(userId, todayIso());
  const planned = await db
    .select({ taskId: dailyPlanItems.taskId })
    .from(dailyPlanItems)
    .where(eq(dailyPlanItems.dailyPlanId, planId));
  return loadEligibleForPlan(
    userId,
    planned.map((item) => item.taskId),
  );
}

export async function removeFromTodayPlan(taskId: string) {
  const userId = await requireUserId();
  await assertOwnsTask(userId, taskId);
  const planId = await ensureDailyPlan(userId, todayIso());
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
    .returning({ id: tasks.id });
  if (!updated) throw new Error("Task not found");
  revalidatePath("/today");
  revalidatePath("/tasks");
}
