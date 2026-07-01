import "server-only";
import { and, asc, eq, inArray, lte, ne, not } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  dailyPlanItems,
  projects,
  tasks,
  weeklyPriorities,
  weeklyReviews,
} from "@/lib/db/schema";
import { todayIso, weekStartIso } from "@/lib/time";
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

export async function loadTodayData(userId: string): Promise<TodayData> {
  const dateIso = todayIso();
  const planId = await ensureDailyPlan(userId, dateIso);

  const slotsRaw = await db
    .select({
      sortOrder: dailyPlanItems.sortOrder,
      task: tasks,
      projectName: projects.name,
    })
    .from(dailyPlanItems)
    .innerJoin(tasks, eq(dailyPlanItems.taskId, tasks.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(dailyPlanItems.dailyPlanId, planId))
    .orderBy(asc(dailyPlanItems.sortOrder));

  const slots: TodaySlot[] = [1, 2, 3].map((n) => {
    const row = slotsRaw[n - 1];
    return {
      slot: n as 1 | 2 | 3,
      task: row ? toTask(row.task, row.projectName ?? null) : null,
    };
  });

  const inPlanIds = slotsRaw.map((r) => r.task.id);

  const alsoDueRows = await db
    .select({ task: tasks, projectName: projects.name })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.userId, userId),
        ne(tasks.status, "done"),
        lte(tasks.dueDate, dateIso),
        inPlanIds.length ? not(inArray(tasks.id, inPlanIds)) : undefined,
      ),
    )
    .orderBy(asc(tasks.dueDate), asc(tasks.priority));

  return {
    planId,
    dateIso,
    slots,
    alsoDue: alsoDueRows.map((r) => toTask(r.task, r.projectName ?? null)),
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
  const [review] = await db
    .select({ id: weeklyReviews.id })
    .from(weeklyReviews)
    .where(
      and(
        eq(weeklyReviews.userId, userId),
        eq(weeklyReviews.weekStartDate, weekStart),
      ),
    );

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

  const rows = await db
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
