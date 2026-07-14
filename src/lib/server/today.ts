import "server-only";
import { and, asc, eq, inArray, lte, ne, not } from "drizzle-orm";
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
import type { Priority } from "@/lib/types";
import { ensureDailyPlan } from "./priority-cap";
import { loadTaskPriorities } from "./task-priority";

export type TodayTask = {
  id: string;
  title: string;
  priority: Priority | null;
  status: "inbox" | "next_action" | "waiting_on" | "done";
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
  planId: string;
  dateIso: string;
  slots: TodaySlot[];
  tomorrowPlanId: string;
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

async function loadPlanSlots(
  userId: string,
  dateIso: string,
): Promise<{ planId: string; slots: TodaySlot[]; taskIds: string[] }> {
  const planRows = await db
    .select({
      planId: dailyPlans.id,
      task: tasks,
      projectName: projects.name,
    })
    .from(dailyPlans)
    .leftJoin(dailyPlanItems, eq(dailyPlanItems.dailyPlanId, dailyPlans.id))
    .leftJoin(tasks, eq(dailyPlanItems.taskId, tasks.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, dateIso)))
    .orderBy(asc(dailyPlanItems.sortOrder));

  const planId =
    planRows[0]?.planId ?? (await ensureDailyPlan(userId, dateIso));

  const slotTasks = planRows.flatMap((r) =>
    r.task ? [{ task: r.task, projectName: r.projectName }] : [],
  );

  const slots: TodaySlot[] = [1, 2, 3].map((n) => {
    const row = slotTasks[n - 1];
    // Priority is filled in by the caller once the priority-tag map has
    // resolved — see `withPriority` in loadTodayData.
    return {
      slot: n as 1 | 2 | 3,
      task: row ? toTask(row.task, row.projectName ?? null, null) : null,
    };
  });

  return { planId, slots, taskIds: slotTasks.map((r) => r.task.id) };
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
    planId: todayPlan.planId,
    dateIso,
    slots: withPriority(todayPlan.slots),
    tomorrowPlanId: tomorrowPlan.planId,
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
 * Tasks eligible for adding to today's plan, ranked by
 * (is-weekly-priority desc, due-date asc null-last, priority tag asc).
 */
export async function loadEligibleForPlan(
  userId: string,
  excludeTaskIds: string[],
): Promise<TodayTask[]> {
  const weekStart = weekStartIso();
  const [priorities, reviewRows, rows] = await Promise.all([
    loadTaskPriorities(userId),
    db
      .select({ id: weeklyReviews.id })
      .from(weeklyReviews)
      .where(
        and(
          eq(weeklyReviews.userId, userId),
          eq(weeklyReviews.weekStartDate, weekStart),
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
          excludeTaskIds.length
            ? not(inArray(tasks.id, excludeTaskIds))
            : undefined,
        ),
      ),
  ]);
  const [review] = reviewRows;

  const weekPrioIds = new Set(
    review
      ? (
          await db
            .select({ id: weeklyPriorities.taskId })
            .from(weeklyPriorities)
            .where(eq(weeklyPriorities.weeklyReviewId, review.id))
        ).map((r) => r.id)
      : [],
  );

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
