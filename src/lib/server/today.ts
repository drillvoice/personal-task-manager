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
import { todayIso, tomorrowIso, weekStartIso } from "@/lib/time";
import { ensureDailyPlan } from "./priority-cap";

export type TodayTask = {
  id: string;
  title: string;
  priority: 1 | 2 | 3;
  status: "inbox" | "next_action" | "waiting_on" | "done";
  dueDate: string | null;
  projectId: string | null;
  projectName: string | null;
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
};

function toTask(
  task: typeof tasks.$inferSelect,
  projectName: string | null,
): TodayTask {
  return {
    id: task.id,
    title: task.title,
    priority: task.priority as 1 | 2 | 3,
    status: task.status,
    dueDate: task.dueDate,
    projectId: task.projectId,
    projectName,
  };
}

async function loadPlanSlots(
  userId: string,
  dateIso: string,
): Promise<{ planId: string; slots: TodaySlot[]; taskIds: string[] }> {
  const planRows = await db
    .select({
      planId: dailyPlans.id,
      sortOrder: dailyPlanItems.sortOrder,
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

  // Placement is keyed on sort_order (the stable slot index), not array
  // position, so removing a middle slot leaves that slot empty rather than
  // shifting the others up.
  const bySlot = new Map<
    number,
    { task: typeof tasks.$inferSelect; projectName: string | null }
  >(
    planRows.flatMap((r) =>
      r.task && r.sortOrder !== null
        ? [[r.sortOrder, { task: r.task, projectName: r.projectName }] as const]
        : [],
    ),
  );

  const slots: TodaySlot[] = [1, 2, 3].map((n) => {
    const row = bySlot.get(n - 1);
    return {
      slot: n as 1 | 2 | 3,
      task: row ? toTask(row.task, row.projectName ?? null) : null,
    };
  });

  return {
    planId,
    slots,
    taskIds: slots.flatMap((s) => (s.task ? [s.task.id] : [])),
  };
}

export async function loadTodayData(userId: string): Promise<TodayData> {
  const dateIso = todayIso();
  const tomorrowDateIso = tomorrowIso();

  // Today's plan, tomorrow's plan, and the also-due list all run in
  // parallel — this page renders on every app open, so roundtrips matter.
  const [todayPlan, tomorrowPlan, alsoDueRows] = await Promise.all([
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
      .orderBy(asc(tasks.dueDate), asc(tasks.priority)),
  ]);

  const inPlanIds = new Set(todayPlan.taskIds);

  return {
    planId: todayPlan.planId,
    dateIso,
    slots: todayPlan.slots,
    tomorrowPlanId: tomorrowPlan.planId,
    tomorrowDateIso,
    tomorrowSlots: tomorrowPlan.slots,
    alsoDue: alsoDueRows
      .filter((r) => !inPlanIds.has(r.task.id))
      .map((r) => toTask(r.task, r.projectName ?? null)),
  };
}

/**
 * Tasks eligible for adding to today's plan, ranked by
 * (is-weekly-priority desc, due-date asc null-last, priority asc).
 */
export async function loadEligibleForPlan(
  userId: string,
  excludeTaskIds: string[],
): Promise<TodayTask[]> {
  const weekStart = weekStartIso();
  const [reviewRows, rows] = await Promise.all([
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
      task: toTask(r.task, r.projectName ?? null),
      weekly: weekPrioIds.has(r.task.id),
    }))
    .sort((a, b) => {
      if (a.weekly !== b.weekly) return a.weekly ? -1 : 1;
      const aDue = a.task.dueDate;
      const bDue = b.task.dueDate;
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;
      if (aDue && bDue && aDue !== bDue) return aDue < bDue ? -1 : 1;
      return a.task.priority - b.task.priority;
    })
    .map((x) => x.task);
}
