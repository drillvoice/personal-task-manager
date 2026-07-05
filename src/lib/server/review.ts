import "server-only";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  projectWeeklyNotes,
  projects,
  tasks,
  weeklyPriorities,
  weeklyReviews,
} from "@/lib/db/schema";
import { ensureWeeklyReview } from "./priority-cap";
import { computeStreak, lastCompletedReview } from "./streak";
import { weekLabel, weekStartIso } from "@/lib/time";

export type ReviewTask = {
  id: string;
  title: string;
  priority: 1 | 2 | 3;
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

export type ReviewData = {
  review: {
    id: string;
    weekStartDate: string;
    inboxCleared: boolean;
    loopsCaptured: boolean;
    lastWeekCalendarReviewed: boolean;
    thisWeekCalendarReviewed: boolean;
    reflectionNotes: string;
    completedAt: Date | null;
  };
  streak: number;
  lastCompletedAt: Date | null;
  activeProjects: ReviewProject[];
  actionableTasks: ReviewTask[];
  selectedPriorityIds: string[];
};

export async function loadReviewData(userId: string): Promise<ReviewData> {
  const weekStart = weekStartIso();
  const reviewId = await ensureWeeklyReview(userId, weekStart);

  const [reviewRows, priorReviews, projectRows, taskRows, priorityRows, noteRows] =
    await Promise.all([
      db.select().from(weeklyReviews).where(eq(weeklyReviews.id, reviewId)),
      db
        .select({
          weekStartDate: weeklyReviews.weekStartDate,
          completedAt: weeklyReviews.completedAt,
        })
        .from(weeklyReviews)
        .where(eq(weeklyReviews.userId, userId))
        .orderBy(desc(weeklyReviews.weekStartDate)),
      db
        .select()
        .from(projects)
        .where(and(eq(projects.userId, userId), eq(projects.status, "active")))
        .orderBy(asc(projects.name)),
      db
        .select({ task: tasks, projectName: projects.name })
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(and(eq(tasks.userId, userId), ne(tasks.status, "done")))
        .orderBy(asc(tasks.priority)),
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
        .where(
          and(eq(projects.userId, userId), eq(projects.status, "active")),
        )
        .orderBy(desc(projectWeeklyNotes.weekStartDate)),
    ]);
  const [review] = reviewRows;

  const streak = computeStreak(priorReviews, weekStart);
  const last = lastCompletedReview(priorReviews);

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

  const tasksByProject = new Map<string, ReviewTask[]>();
  const actionable: ReviewTask[] = [];
  for (const r of taskRows) {
    const t: ReviewTask = {
      id: r.task.id,
      title: r.task.title,
      priority: r.task.priority as 1 | 2 | 3,
      status: r.task.status,
      dueDate: r.task.dueDate,
      projectId: r.task.projectId,
      projectName: r.projectName ?? null,
    };
    if (r.task.projectId) {
      const list = tasksByProject.get(r.task.projectId) ?? [];
      list.push(t);
      tasksByProject.set(r.task.projectId, list);
    }
    actionable.push(t);
  }

  return {
    review: {
      id: review.id,
      weekStartDate: review.weekStartDate,
      inboxCleared: review.inboxCleared,
      loopsCaptured: review.loopsCaptured,
      lastWeekCalendarReviewed: review.lastWeekCalendarReviewed,
      thisWeekCalendarReviewed: review.thisWeekCalendarReviewed,
      reflectionNotes: review.reflectionNotes,
      completedAt: review.completedAt,
    },
    streak,
    lastCompletedAt: last?.completedAt ?? null,
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
    selectedPriorityIds: priorityRows.map((r) => r.taskId),
  };
}
