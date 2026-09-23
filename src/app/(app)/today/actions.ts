"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { dailyPlanItems, dailyPlans, tasks } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";
import { ownsTask } from "@/lib/server/ownership";
import {
  claimDailyPlanSlot,
  ensureDailyPlan,
} from "@/lib/server/priority-cap";
import { loadEligibleForPlan } from "@/lib/server/today";
import { loadContactOptions, type ContactOption } from "@/lib/server/people";
import { loadProjectOptions } from "@/lib/server/projects";
import {
  loadTaskForEdit,
  loadTaskTagOptions,
  type TagOption,
  type TasksViewTask,
} from "@/lib/server/tasks";
import { todayIso, tomorrowIso } from "@/lib/time";

async function assertOwnsTask(userId: string, taskId: string) {
  if (!(await ownsTask(userId, taskId))) throw new Error("Task not found");
}

async function addToPlanForDate(
  taskId: string,
  dateIso: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const [, planId] = await Promise.all([
    assertOwnsTask(userId, taskId),
    ensureDailyPlan(userId, dateIso),
  ]);
  const slot = await claimDailyPlanSlot(planId);
  if (!slot.ok) return slot;
  await db
    .insert(dailyPlanItems)
    .values({ dailyPlanId: planId, taskId, sortOrder: slot.sortOrder })
    .onConflictDoNothing();
  revalidatePath("/today");
  revalidatePath("/tasks");
  return { ok: true };
}

async function loadEligibleForPlanDate(dateIso: string) {
  const userId = await requireUserId();
  return loadEligibleForPlan(userId, dateIso);
}

// One statement: scoping to the user's own plan for the date is the ownership
// check, and removing from a plan that doesn't exist yet is a no-op rather than
// a reason to create one.
async function removeFromPlanForDate(taskId: string, dateIso: string) {
  const userId = await requireUserId();
  await db.delete(dailyPlanItems).where(
    and(
      eq(dailyPlanItems.taskId, taskId),
      inArray(
        dailyPlanItems.dailyPlanId,
        db
          .select({ id: dailyPlans.id })
          .from(dailyPlans)
          .where(
            and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, dateIso)),
          ),
      ),
    ),
  );
  revalidatePath("/today");
  revalidatePath("/tasks");
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

export type TaskEditData = {
  task: TasksViewTask;
  projects: { id: string; name: string }[];
  people: ContactOption[];
  tagOptions: TagOption[];
};

// Loaded on demand when a task on the Today screen is opened for editing —
// the Today page itself stays lean since it renders on every app open.
export async function loadTaskEditData(
  taskId: string,
): Promise<TaskEditData | null> {
  const userId = await requireUserId();
  const [task, projectOptions, contacts, tagOptions] = await Promise.all([
    loadTaskForEdit(userId, taskId),
    loadProjectOptions(userId),
    loadContactOptions(userId),
    loadTaskTagOptions(userId),
  ]);
  if (!task) return null;
  // Archived projects stay in the list (suffixed, sorted last) so assigning
  // one still reactivates it; only the Inbox pseudo-option is dropped.
  const projects = projectOptions.filter(
    (p): p is { id: string; name: string } => p.id !== null,
  );
  return { task, projects, people: contacts.people, tagOptions };
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
  revalidatePath("/review");
  if (updated.meetingId) revalidatePath(`/meetings/${updated.meetingId}`);
  return { ok: true };
}
