import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  ne,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  projectWeeklyNotes,
  projects,
  tasks,
  weeklyPriorities,
  weeklyReviews,
} from "@/lib/db/schema";
import { comparePriority } from "@/lib/priority";
import { APP_TZ, daysSince, weekLabel, weekStartIso } from "@/lib/time";
import type { Priority } from "@/lib/types";
import { ensureOpenReview, getOpenReviewId } from "./priority-cap";
import { computeStreak, lastCompletedReview } from "./streak";
import { loadTaskPriorities } from "./task-priority";

// A completed review that's still this recent keeps showing its "filed"
// confirmation; past this, opening /review starts a fresh one automatically.
const NEW_REVIEW_AFTER_DAYS = 5;

export type ReviewTask = {
  id: string;
  title: string;
  priority: Priority | null;
  status: "inbox" | "next_action" | "waiting_on" | "done";
  dueDate: string | null;
  projectId: string | null;
  projectName: string | null;
};

export type ReviewProject = {
  id: string;
  name: string;
  notes: string;
  previousNotes: string | null;
  previousWeekLabel: string | null;
  tasks: ReviewTask[];
};

type StreakHeader = {
  streak: number;
  lastCompletedAt: Date | null;
  completedThisWeek: number;
};

export type ReviewEditingData = StreakHeader & {
  mode: "editing";
  review: {
    id: string;
    weekStartDate: string;
    inboxCleared: boolean;
    loopsCaptured: boolean;
    lastWeekCalendarReviewed: boolean;
    thisWeekCalendarReviewed: boolean;
    reflectionNotes: string;
  };
  activeProjects: ReviewProject[];
  actionableTasks: ReviewTask[];
  selectedPriorityIds: string[];
};

export type ReviewCompletedData = StreakHeader & {
  mode: "completed";
  completed: {
    weekStartDate: string;
    weekLabel: string;
    completedAt: Date;
    reflectionNotes: string;
    priorities: { title: string; done: boolean }[];
  };
};

export type ReviewData = ReviewEditingData | ReviewCompletedData;

export async function loadReviewData(userId: string): Promise<ReviewData> {
  const weekStart = weekStartIso();
  const openReviewId = await getOpenReviewId(userId);

  if (!openReviewId) {
    const [recent] = await db
      .select({
        id: weeklyReviews.id,
        weekStartDate: weeklyReviews.weekStartDate,
        completedAt: weeklyReviews.completedAt,
        reflectionNotes: weeklyReviews.reflectionNotes,
      })
      .from(weeklyReviews)
      .where(
        and(
          eq(weeklyReviews.userId, userId),
          isNotNull(weeklyReviews.completedAt),
        ),
      )
      .orderBy(desc(weeklyReviews.completedAt))
      .limit(1);

    if (recent?.completedAt && daysSince(recent.completedAt) < NEW_REVIEW_AFTER_DAYS) {
      return loadCompletedData(userId, weekStart, {
        weekStartDate: recent.weekStartDate,
        completedAt: recent.completedAt,
        reflectionNotes: recent.reflectionNotes,
        reviewId: recent.id,
      });
    }
  }

  const reviewId = openReviewId ?? (await ensureOpenReview(userId));
  return loadEditingData(userId, weekStart, reviewId);
}

async function loadStreakHeader(
  userId: string,
  weekStart: string,
): Promise<StreakHeader> {
  const [priorReviews, completedRows] = await Promise.all([
    db
      .select({
        weekStartDate: weeklyReviews.weekStartDate,
        completedAt: weeklyReviews.completedAt,
      })
      .from(weeklyReviews)
      .where(eq(weeklyReviews.userId, userId))
      .orderBy(desc(weeklyReviews.weekStartDate)),
    db
      .select({ value: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, "done"),
          sql`(${tasks.completedAt} at time zone ${APP_TZ})::date >= ${weekStart}`,
        ),
      ),
  ]);

  return {
    streak: computeStreak(priorReviews, weekStart),
    lastCompletedAt: lastCompletedReview(priorReviews)?.completedAt ?? null,
    completedThisWeek: completedRows[0]?.value ?? 0,
  };
}

async function loadCompletedData(
  userId: string,
  weekStart: string,
  recent: {
    weekStartDate: string;
    completedAt: Date;
    reflectionNotes: string;
    reviewId: string;
  },
): Promise<ReviewCompletedData> {
  const [header, priorityRows] = await Promise.all([
    loadStreakHeader(userId, weekStart),
    db
      .select({ title: tasks.title, status: tasks.status })
      .from(weeklyPriorities)
      .innerJoin(tasks, eq(weeklyPriorities.taskId, tasks.id))
      .where(eq(weeklyPriorities.weeklyReviewId, recent.reviewId))
      .orderBy(asc(weeklyPriorities.sortOrder)),
  ]);

  return {
    mode: "completed",
    ...header,
    completed: {
      weekStartDate: recent.weekStartDate,
      weekLabel: weekLabel(recent.weekStartDate),
      completedAt: recent.completedAt,
      reflectionNotes: recent.reflectionNotes,
      priorities: priorityRows.map((p) => ({
        title: p.title,
        done: p.status === "done",
      })),
    },
  };
}

async function loadEditingData(
  userId: string,
  weekStart: string,
  reviewId: string,
): Promise<ReviewEditingData> {
  const [
    header,
    priorities,
    reviewRows,
    projectRows,
    taskRows,
    priorityRows,
    noteRows,
  ] = await Promise.all([
    loadStreakHeader(userId, weekStart),
    loadTaskPriorities(userId),
    db.select().from(weeklyReviews).where(eq(weeklyReviews.id, reviewId)),
    db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.status, "active")))
      .orderBy(asc(projects.name)),
    db
      .select({ task: tasks, projectName: projects.name })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(tasks.userId, userId), ne(tasks.status, "done"))),
    db
      .select({ taskId: weeklyPriorities.taskId })
      .from(weeklyPriorities)
      .where(eq(weeklyPriorities.weeklyReviewId, reviewId)),
    db
      .select({
        projectId: projectWeeklyNotes.projectId,
        weekStartDate: projectWeeklyNotes.weekStartDate,
        note: projectWeeklyNotes.note,
      })
      .from(projectWeeklyNotes)
      .innerJoin(projects, eq(projectWeeklyNotes.projectId, projects.id))
      .where(and(eq(projects.userId, userId), eq(projects.status, "active")))
      .orderBy(desc(projectWeeklyNotes.weekStartDate)),
  ]);
  const [review] = reviewRows;
  const selectedPriorityIds = priorityRows.map((r) => r.taskId);

  const notesByProject = new Map<
    string,
    { current: string; previous: string; previousWeek: string } | undefined
  >();
  for (const n of noteRows) {
    const existing = notesByProject.get(n.projectId) ?? {
      current: "",
      previous: "",
      previousWeek: "",
    };
    if (n.weekStartDate === weekStart) {
      existing.current = n.note;
    } else if (!existing.previousWeek && n.note.trim()) {
      existing.previous = n.note;
      existing.previousWeek = n.weekStartDate;
    }
    notesByProject.set(n.projectId, existing);
  }

  const toReviewTask = (
    task: typeof tasks.$inferSelect,
    projectName: string | null,
  ): ReviewTask => ({
    id: task.id,
    title: task.title,
    priority: priorities.get(task.id) ?? null,
    status: task.status,
    dueDate: task.dueDate,
    projectId: task.projectId,
    projectName,
  });

  const actionable: ReviewTask[] = taskRows.map((r) =>
    toReviewTask(r.task, r.projectName ?? null),
  );

  // A priority task completed mid-review drops out of the open-tasks query but
  // is still selected — pull those back in so the "x/3" count stays honest and
  // the selection remains untickable.
  const actionableIds = new Set(actionable.map((t) => t.id));
  const missingSelected = selectedPriorityIds.filter(
    (id) => !actionableIds.has(id),
  );
  if (missingSelected.length > 0) {
    const extra = await db
      .select({ task: tasks, projectName: projects.name })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(eq(tasks.userId, userId), inArray(tasks.id, missingSelected)),
      );
    for (const r of extra) {
      actionable.push(toReviewTask(r.task, r.projectName ?? null));
    }
  }

  actionable.sort((a, b) => comparePriority(a.priority, b.priority));

  const tasksByProject = new Map<string, ReviewTask[]>();
  for (const t of actionable) {
    if (t.projectId && t.status !== "done") {
      const list = tasksByProject.get(t.projectId) ?? [];
      list.push(t);
      tasksByProject.set(t.projectId, list);
    }
  }

  return {
    mode: "editing",
    ...header,
    review: {
      id: review.id,
      weekStartDate: review.weekStartDate,
      inboxCleared: review.inboxCleared,
      loopsCaptured: review.loopsCaptured,
      lastWeekCalendarReviewed: review.lastWeekCalendarReviewed,
      thisWeekCalendarReviewed: review.thisWeekCalendarReviewed,
      reflectionNotes: review.reflectionNotes,
    },
    activeProjects: projectRows.map((p) => {
      const entry = notesByProject.get(p.id);
      return {
        id: p.id,
        name: p.name,
        notes: entry?.current ?? "",
        previousNotes: entry?.previousWeek ? entry.previous : null,
        previousWeekLabel: entry?.previousWeek
          ? weekLabel(entry.previousWeek)
          : null,
        tasks: tasksByProject.get(p.id) ?? [],
      };
    }),
    actionableTasks: actionable,
    selectedPriorityIds,
  };
}
