import "server-only";
import { and, asc, eq, ne, or, sql, type SQL } from "drizzle-orm";
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

type TaskTagRow = { id: string; name: string; color: string };

function toTasksViewTask(
  task: typeof tasks.$inferSelect,
  projectName: string | null,
  allTags: TaskTagRow[],
  assignees: { id: string; name: string }[],
  weekly: boolean,
  inTodayPlan: boolean,
): TasksViewTask {
  return {
    id: task.id,
    title: task.title,
    priority: priorityFromTagNames(allTags.map((tg) => tg.name)),
    status: task.status,
    dueDate: task.dueDate,
    notes: task.notes,
    projectId: task.projectId,
    projectName,
    assignees,
    tags: allTags.filter((tg) => !isPriorityTagName(tg.name)),
    allTagIds: allTags.map((tg) => tg.id),
    weekly,
    inTodayPlan,
  };
}

function weeklyPriorityTaskIds(userId: string, where?: SQL) {
  return db
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
        where,
      ),
    );
}

function todayPlanTaskIds(userId: string, where?: SQL) {
  return db
    .select({ taskId: dailyPlanItems.taskId })
    .from(dailyPlanItems)
    .innerJoin(dailyPlans, eq(dailyPlanItems.dailyPlanId, dailyPlans.id))
    .where(
      and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, todayIso()), where),
    );
}

/**
 * One task in the Tasks-view shape, for opening the editor from a screen that
 * doesn't carry it (Today). A single parallel round of narrow queries, rather
 * than loading the whole Tasks view to pick one row out of it.
 */
export async function loadTaskForEdit(
  userId: string,
  taskId: string,
): Promise<TasksViewTask | null> {
  const [taskRows, tagRows, assigneeRows, weeklyRows, todayRows] =
    await Promise.all([
      db
        .select({ task: tasks, projectName: projects.name })
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))),
      db
        .select({ id: tags.id, name: tags.name, color: tags.color })
        .from(taskTags)
        .innerJoin(tags, eq(taskTags.tagId, tags.id))
        .where(and(eq(taskTags.taskId, taskId), eq(tags.userId, userId))),
      db
        .select({ id: people.id, name: people.name })
        .from(taskAssignees)
        .innerJoin(people, eq(taskAssignees.personId, people.id))
        .where(
          and(eq(taskAssignees.taskId, taskId), eq(people.userId, userId)),
        )
        .orderBy(asc(people.name)),
      weeklyPriorityTaskIds(userId, eq(weeklyPriorities.taskId, taskId)),
      todayPlanTaskIds(userId, eq(dailyPlanItems.taskId, taskId)),
    ]);
  const [row] = taskRows;
  if (!row) return null;
  return toTasksViewTask(
    row.task,
    row.projectName ?? null,
    tagRows,
    assigneeRows,
    weeklyRows.length > 0,
    todayRows.length > 0,
  );
}

export async function loadTasksData(userId: string) {
  const currentWeek = weekStartIso();
  // Done tasks older than 30 days are unreachable from this view (the Done
  // chip shows recent completions only), so neither they nor their tag and
  // assignee links ship on every page load.
  const visibleTask = and(
    eq(tasks.userId, userId),
    or(
      ne(tasks.status, "done"),
      sql`${tasks.completedAt} >= now() - interval '30 days'`,
    ),
  );
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
      .where(visibleTask)
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
      .where(visibleTask),
    db
      .select({
        taskId: taskAssignees.taskId,
        id: people.id,
        name: people.name,
      })
      .from(taskAssignees)
      .innerJoin(people, eq(taskAssignees.personId, people.id))
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .where(visibleTask)
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
    weeklyPriorityTaskIds(userId),
    todayPlanTaskIds(userId),
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
    const t = toTasksViewTask(
      r.task,
      r.projectName ?? null,
      tagsByTask.get(r.task.id) ?? [],
      assigneesByTask.get(r.task.id) ?? [],
      weeklyIds.has(r.task.id),
      todayPlanIds.has(r.task.id),
    );
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
