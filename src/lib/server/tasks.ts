import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  people,
  projectWeeklyNotes,
  projects,
  tags,
  taskAssignees,
  taskTags,
  tasks,
} from "@/lib/db/schema";
import { weekStartIso } from "@/lib/time";

export type TasksViewProject = {
  id: string | null; // null = Inbox pseudo-project
  name: string;
  status: "active" | "someday_maybe" | "on_hold" | "completed" | "archived";
  notes: string;
  tasks: TasksViewTask[];
};

export type TasksViewTask = {
  id: string;
  title: string;
  priority: 1 | 2 | 3;
  status: "inbox" | "next_action" | "waiting_on" | "done";
  dueDate: string | null;
  projectId: string | null;
  projectName: string | null;
  assignees: { id: string; name: string }[];
  tags: { id: string; name: string; color: string }[];
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
  const [projectRows, taskRows, tagRows, assigneeRows, noteRows] =
    await Promise.all([
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
        .where(eq(tasks.userId, userId))
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
    ]);

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

  const projectsById = new Map<string, TasksViewProject>();
  for (const p of projectRows) {
    projectsById.set(p.id, {
      id: p.id,
      name: p.name,
      status: p.status,
      notes: notesByProject.get(p.id) ?? "",
      tasks: [],
    });
  }

  const inbox: TasksViewProject = {
    id: null,
    name: "Inbox (no project)",
    status: "active",
    notes: "",
    tasks: [],
  };

  for (const r of taskRows) {
    const t: TasksViewTask = {
      id: r.task.id,
      title: r.task.title,
      priority: r.task.priority as 1 | 2 | 3,
      status: r.task.status,
      dueDate: r.task.dueDate,
      projectId: r.task.projectId,
      projectName: r.projectName ?? null,
      assignees: assigneesByTask.get(r.task.id) ?? [],
      tags: tagsByTask.get(r.task.id) ?? [],
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
  };
}
