import "server-only";
import { and, asc, eq, lte, ne, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  dailyPlanItems,
  dailyPlans,
  projects,
  tasks,
  weeklyPriorities,
  weeklyReviews,
} from "@/lib/db/schema";
import { comparePriority } from "@/lib/priority";
import { todayIso, tomorrowIso, weekStartIso } from "@/lib/time";
import type { Priority, TaskStatus } from "@/lib/types";
import { loadTaskPriorities } from "./task-priority";

export type TodayTask = {
  id: string;
  title: string;
  priority: Priority | null;
  status: TaskStatus;
  dueDate: string | null;
  projectId: string | null;
  projectName: string | null;
  // On this week's top-3 (weekly review priorities).
  weekly: boolean;
};

export type TodaySlot = {
  slot: 1 | 2 | 3;
  task: TodayTask | null;
};

export type TodayData = {
  dateIso: string;
  slots: TodaySlot[];
  tomorrowDateIso: string;
  tomorrowSlots: TodaySlot[];
  alsoDue: TodayTask[];
  weeklyPriorities: TodayTask[];
};

function toTask(
  task: typeof tasks.$inferSelect,
  projectName: string | null,
  priority: Priority | null,
  weekly = false,
): TodayTask {
  return {
    id: task.id,
    title: task.title,
    priority,
    status: task.status,
    dueDate: task.dueDate,
    projectId: task.projectId,
    projectName,
    weekly,
  };
}

/** The current week's review top-3, ordered as chosen in the review. */
async function loadWeeklyPriorityRows(
  userId: string,
): Promise<{ task: typeof tasks.$inferSelect; projectName: string | null }[]> {
  return db
    .select({ task: tasks, projectName: projects.name })
    .from(weeklyPriorities)
    .innerJoin(
      weeklyReviews,
      eq(weeklyPriorities.weeklyReviewId, weeklyReviews.id),
    )
    .innerJoin(tasks, eq(weeklyPriorities.taskId, tasks.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(weeklyReviews.userId, userId),
        eq(weeklyReviews.weekStartDate, weekStartIso()),
      ),
    )
    .orderBy(asc(weeklyPriorities.sortOrder));
}

// Read-only: a day with no plan row yet is just three empty slots. The row is
// created by the first add (addToPlanForDate), so rendering Today never writes.
async function loadPlanSlots(
  userId: string,
  dateIso: string,
): Promise<{ slots: TodaySlot[]; taskIds: string[] }> {
  const slotTasks = await db
    .select({ task: tasks, projectName: projects.name })
    .from(dailyPlanItems)
    .innerJoin(dailyPlans, eq(dailyPlanItems.dailyPlanId, dailyPlans.id))
    .innerJoin(tasks, eq(dailyPlanItems.taskId, tasks.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, dateIso)))
    .orderBy(asc(dailyPlanItems.sortOrder));

  const slots: TodaySlot[] = [1, 2, 3].map((n) => {
    const row = slotTasks[n - 1];
    // Priority is filled in by the caller once the priority-tag map has
    // resolved — see `withPriority` in loadTodayData.
    return {
      slot: n as 1 | 2 | 3,
      task: row ? toTask(row.task, row.projectName ?? null, null) : null,
    };
  });

  return { slots, taskIds: slotTasks.map((r) => r.task.id) };
}

export async function loadTodayData(userId: string): Promise<TodayData> {
  const dateIso = todayIso();
  const tomorrowDateIso = tomorrowIso();

  // Today's plan, tomorrow's plan, the also-due list, and priority tags all
  // run in parallel — this page renders on every app open, so roundtrips
  // matter.
  const [priorities, weeklyRows, todayPlan, tomorrowPlan, alsoDueRows] = await Promise.all([
    loadTaskPriorities(userId),
    loadWeeklyPriorityRows(userId),
    loadPlanSlots(userId, dateIso),
    loadPlanSlots(userId, tomorrowDateIso),
    db
      .select({ task: tasks, projectName: projects.name })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(
          eq(tasks.userId, userId),
          ne(tasks.status, "done"),
          lte(tasks.dueDate, dateIso),
        ),
      )
      .orderBy(asc(tasks.dueDate)),
  ]);

  const weeklyIds = new Set(weeklyRows.map((r) => r.task.id));

  // loadPlanSlots ran before `priorities` resolved above, so re-derive slot
  // priorities from the map now that we have it.
  const withPriority = (slots: TodaySlot[]): TodaySlot[] =>
    slots.map((s) => ({
      ...s,
      task: s.task
        ? {
            ...s.task,
            priority: priorities.get(s.task.id) ?? null,
            weekly: weeklyIds.has(s.task.id),
          }
        : null,
    }));

  const inPlanIds = new Set(todayPlan.taskIds);

  return {
    dateIso,
    slots: withPriority(todayPlan.slots),
    tomorrowDateIso,
    tomorrowSlots: withPriority(tomorrowPlan.slots),
    alsoDue: alsoDueRows
      .filter((r) => !inPlanIds.has(r.task.id))
      .map((r) =>
        toTask(
          r.task,
          r.projectName ?? null,
          priorities.get(r.task.id) ?? null,
          weeklyIds.has(r.task.id),
        ),
      )
      .sort((a, b) => comparePriority(a.priority, b.priority)),
    // `weekly` is left false here: the section header already frames these as
    // this week's priorities, so the per-row ★ wk marker would be redundant.
    weeklyPriorities: weeklyRows.map((r) =>
      toTask(r.task, r.projectName ?? null, priorities.get(r.task.id) ?? null),
    ),
  };
}

/**
 * Tasks eligible for adding to the plan for `dateIso` (open, and not already
 * in that plan), ranked by
 * (is-weekly-priority desc, due-date asc null-last, priority tag asc).
 *
 * Every query here is independent — the already-planned and weekly-priority
 * ids come from subquery/joins rather than a looked-up plan or review id — so
 * opening the picker costs one parallel round of requests.
 */
export async function loadEligibleForPlan(
  userId: string,
  dateIso: string,
): Promise<TodayTask[]> {
  const plannedTaskIds = db
    .select({ taskId: dailyPlanItems.taskId })
    .from(dailyPlanItems)
    .innerJoin(dailyPlans, eq(dailyPlanItems.dailyPlanId, dailyPlans.id))
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, dateIso)));

  const [priorities, weeklyRows, rows] = await Promise.all([
    loadTaskPriorities(userId),
    db
      .select({ taskId: weeklyPriorities.taskId })
      .from(weeklyPriorities)
      .innerJoin(
        weeklyReviews,
        eq(weeklyPriorities.weeklyReviewId, weeklyReviews.id),
      )
      .where(
        and(
          eq(weeklyReviews.userId, userId),
          eq(weeklyReviews.weekStartDate, weekStartIso()),
        ),
      ),
    db
      .select({ task: tasks, projectName: projects.name })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(
          eq(tasks.userId, userId),
          ne(tasks.status, "done"),
          notInArray(tasks.id, plannedTaskIds),
        ),
      ),
  ]);
  const weekPrioIds = new Set(weeklyRows.map((r) => r.taskId));
  return rows
    .map((r) => ({
      task: toTask(
        r.task,
        r.projectName ?? null,
        priorities.get(r.task.id) ?? null,
        weekPrioIds.has(r.task.id),
      ),
      weekly: weekPrioIds.has(r.task.id),
    }))
    .sort((a, b) => {
      if (a.weekly !== b.weekly) return a.weekly ? -1 : 1;
      const aDue = a.task.dueDate;
      const bDue = b.task.dueDate;
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;
      if (aDue && bDue && aDue !== bDue) return aDue < bDue ? -1 : 1;
      return comparePriority(a.task.priority, b.task.priority);
    })
    .map((x) => x.task);
}
