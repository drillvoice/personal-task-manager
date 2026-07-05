import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { people, projects, tags, tasks } from "@/lib/db/schema";

/*
 * Shared single-user ownership guards. Junction tables (task_assignees,
 * task_tags, meeting_*) carry no userId, so any id submitted from the client
 * must be checked against the user's own rows before it's inserted — these are
 * the security boundary, kept in one place so the check can't drift between
 * call sites.
 */

export async function assertOwnsTask(
  userId: string,
  taskId: string,
): Promise<void> {
  const [row] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  if (!row) throw new Error("Task not found");
}

export async function assertOwnsProject(
  userId: string,
  projectId: string,
): Promise<void> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  if (!row) throw new Error("Project not found");
}

export async function ownsProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  return !!row;
}

export async function ownedPersonIds(
  userId: string,
  ids: string[],
): Promise<boolean> {
  if (ids.length === 0) return true;
  const rows = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.userId, userId), inArray(people.id, ids)));
  return rows.length === ids.length;
}

export async function ownedTagIds(
  userId: string,
  ids: string[],
  kind: "task" | "meeting",
): Promise<boolean> {
  if (ids.length === 0) return true;
  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(
      and(eq(tags.userId, userId), eq(tags.kind, kind), inArray(tags.id, ids)),
    );
  return rows.length === ids.length;
}
