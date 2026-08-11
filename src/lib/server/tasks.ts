import "server-only";
import { and, asc, eq, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  dailyPlanItems,
  dailyPlans,
  people,
  projectWeeklyNotes,
  projects,
  tags,
  taskAssignees,
  taskTags,
  tasks,
  weeklyPriorities,
  weeklyReviews,
} from "@/lib/db/schema";
import { isPriorityTagName, priorityFromTagNames } from "@/lib/priority";
import { todayIso, weekStartIso } from "@/lib/time";
import type { Priority, ProjectStatus, TaskStatus } from "@/lib/types";

export type TasksViewProject = {
  id: string | null; // null = Inbox pseudo-project
  name: string;
  status: ProjectStatus;
  // This week's snapshot from project_weekly_notes (read-only here).
  notes: string;
  // The project's current narrative (projects.notes) — editable in the card.
  currentNotes: string;
  tasks: TasksViewTask[];
};

export type TasksViewTask = {
  id: string;
  title: string;
  priority: Priority | null;
  status: TaskStatus;
  dueDate: string | null;
  notes: string;
  projectId: string | null;
  projectName: string | null;
  assignees: { id: string; name: string }[];
  // For *display*: priority tags are stripped, since a row renders those as a
  // PriorityBadge rather than a second chip saying the same thing.
  tags: { id: string; name: string; color: string }[];
  // For *editing*: the complete set, priority tags included. Seeding a tag
  // picker from `tags` above would omit them, and saving replaces the whole
  // set — so an unrelated tag edit silently deleted the task's priority.
  allTagIds: string[];
  // On this week's top-3 (weekly review priorities).
  weekly: boolean;
  // In one of today's three daily-plan slots.
  inTodayPlan: boolean;
};

export type TagOption = { id: string; name: string; color: string };

export async function loadTaskTagOptions(userId: string): Promise<TagOption[]> {
  return db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(tags)
    .where(and(eq(tags.userId, userId), eq(tags.kind, "task")))
    .orderBy(asc(tags.name));
}

export async function loadTasksData(userId: string) {
  const currentWeek = weekStartIso();
  const [
    projectRows,
    taskRows,
    tagRows,
    assigneeRows,
    noteRows,
    weeklyRows,
    todayPlanRows,
  ] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(asc(projects.name)),
    db
      .select({
        task: tasks,
        projectName: projects.name,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(
          eq(tasks.userId, userId),
          // Done tasks older than 30 days are unreachable from this view
          // (the Done chip shows recent completions only), so don't ship
          // an ever-growing archive on every page load.
          or(
            ne(tasks.status, "done"),
            sql`${tasks.completedAt} >= now() - interval '30 days'`,
          ),
        ),
      )
      .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt)),
    db
      .select({
        taskId: taskTags.taskId,
        id: tags.id,
        name: tags.name,
        color: tags.color,
      })
      .from(taskTags)
      .innerJoin(tags, eq(taskTags.tagId, tags.id))
      .innerJoin(tasks, eq(taskTags.taskId, tasks.id))
      .where(eq(tasks.userId, userId)),
    db
      .select({
        taskId: taskAssignees.taskId,
        id: people.id,
        name: people.name,
      })
      .from(taskAssignees)
      .innerJoin(people, eq(taskAssignees.personId, people.id))
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .where(eq(tasks.userId, userId))
      .orderBy(asc(people.name)),
    db
      .select({
        projectId: projectWeeklyNotes.projectId,
        note: projectWeeklyNotes.note,
      })
      .from(projectWeeklyNotes)
      .innerJoin(projects, eq(projectWeeklyNotes.projectId, projects.id))
      .where(
        and(
          eq(projects.userId, userId),
          eq(projectWeeklyNotes.weekStartDate, currentWeek),
        ),
      ),
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
          eq(weeklyReviews.weekStartDate, currentWeek),
        ),
      ),
    db
      .select({ taskId: dailyPlanItems.taskId })
      .from(dailyPlanItems)
      .innerJoin(dailyPlans, eq(dailyPlanItems.dailyPlanId, dailyPlans.id))
      .where(
        and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, todayIso())),
      ),
  ]);

  const weeklyIds = new Set(weeklyRows.map((r) => r.taskId));
  const todayPlanIds = new Set(todayPlanRows.map((r) => r.taskId));

  const notesByProject = new Map(noteRows.map((n) => [n.projectId, n.note]));

  const tagsByTask = new Map<
    string,
    { id: string; name: string; color: string }[]
  >();
  for (const t of tagRows) {
    const list = tagsByTask.get(t.taskId) ?? [];
    list.push({ id: t.id, name: t.name, color: t.color });
    tagsByTask.set(t.taskId, list);
  }

  const assigneesByTask = new Map<string, { id: string; name: string }[]>();
  for (const a of assigneeRows) {
    const list = assigneesByTask.get(a.taskId) ?? [];
    list.push({ id: a.id, name: a.name });
    assigneesByTask.set(a.taskId, list);
  }

  // Archived projects are hidden from every Tasks grouping and filter chip,
  // but stay in `archivedProjects` so they remain assignable — picking one is
  // what reactivates it (see reactivate-project.ts).
  const archivedProjects = projectRows
    .filter((p) => p.status === "archived")
    .map((p) => ({ id: p.id, name: p.name }));

  const projectsById = new Map<string, TasksViewProject>();
  for (const p of projectRows) {
    if (p.status === "archived") continue;
    projectsById.set(p.id, {
      id: p.id,
      name: p.name,
      status: p.status,
      notes: notesByProject.get(p.id) ?? "",
      currentNotes: p.notes,
      tasks: [],
    });
  }

  const inbox: TasksViewProject = {
    id: null,
    name: "Inbox (no project)",
    status: "active",
    notes: "",
    currentNotes: "",
    tasks: [],
  };

  for (const r of taskRows) {
    const allTags = tagsByTask.get(r.task.id) ?? [];
    const t: TasksViewTask = {
      id: r.task.id,
      title: r.task.title,
      priority: priorityFromTagNames(allTags.map((tg) => tg.name)),
      status: r.task.status,
      dueDate: r.task.dueDate,
      notes: r.task.notes,
      projectId: r.task.projectId,
      projectName: r.projectName ?? null,
      assignees: assigneesByTask.get(r.task.id) ?? [],
      tags: allTags.filter((tg) => !isPriorityTagName(tg.name)),
      allTagIds: allTags.map((tg) => tg.id),
      weekly: weeklyIds.has(r.task.id),
      inTodayPlan: todayPlanIds.has(r.task.id),
    };
    if (r.task.projectId) {
      const p = projectsById.get(r.task.projectId);
      if (p) p.tasks.push(t);
    } else {
      inbox.tasks.push(t);
    }
  }

  return {
    projects: [inbox, ...projectsById.values()],
    archivedProjects,
  };
}
