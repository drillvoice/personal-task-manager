import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, tags, taskTags, tasks } from "@/lib/db/schema";

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
  tags: { name: string; color: string }[];
};

export async function loadTasksData(userId: string) {
  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(asc(projects.name));

  const taskRows = await db
    .select({ task: tasks, projectName: projects.name })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

  const tagRows = await db
    .select({ taskId: taskTags.taskId, name: tags.name, color: tags.color })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .innerJoin(tasks, eq(taskTags.taskId, tasks.id))
    .where(eq(tasks.userId, userId));

  const tagsByTask = new Map<string, { name: string; color: string }[]>();
  for (const t of tagRows) {
    const list = tagsByTask.get(t.taskId) ?? [];
    list.push({ name: t.name, color: t.color });
    tagsByTask.set(t.taskId, list);
  }

  const projectsById = new Map<string, TasksViewProject>();
  for (const p of projectRows) {
    projectsById.set(p.id, {
      id: p.id,
      name: p.name,
      status: p.status,
      notes: p.notes,
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
