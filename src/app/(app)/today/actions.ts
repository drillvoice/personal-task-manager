"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { dailyPlanItems, tasks } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";
import {
  PriorityCapExceededError,
  assertDailyRoomForOne,
  ensureDailyPlan,
} from "@/lib/server/priority-cap";
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
  try {
    await assertDailyRoomForOne(planId);
  } catch (err) {
    if (err instanceof PriorityCapExceededError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
  const existing = await db
    .select({ id: dailyPlanItems.id })
    .from(dailyPlanItems)
    .where(
      and(
        eq(dailyPlanItems.dailyPlanId, planId),
        eq(dailyPlanItems.taskId, taskId),
      ),
    );
  if (existing.length === 0) {
    const count = await db
      .select({ id: dailyPlanItems.id })
      .from(dailyPlanItems)
      .where(eq(dailyPlanItems.dailyPlanId, planId));
    await db
      .insert(dailyPlanItems)
      .values({ dailyPlanId: planId, taskId, sortOrder: count.length });
  }
  revalidatePath("/today");
  return { ok: true };
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
  await assertOwnsTask(userId, taskId);
  if (done) {
    await db
      .update(tasks)
      .set({ status: "done", completedAt: new Date() })
      .where(eq(tasks.id, taskId));
  } else {
    await db
      .update(tasks)
      .set({ status: "next_action", completedAt: null })
      .where(eq(tasks.id, taskId));
  }
  revalidatePath("/today");
  revalidatePath("/tasks");
}
