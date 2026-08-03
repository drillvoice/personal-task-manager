import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, tasks } from "@/lib/db/schema";

/*
 * Does this row belong to this user?
 *
 * Predicates rather than assertions on purpose: the callers disagree about what
 * a miss means. Server actions with a `{ ok: false, error }` contract return
 * one; the ones invoked straight from a form throw, since there is no result
 * for the client to read. Forcing either style on the other would mean a
 * caller catching its own helper to reshape the failure.
 */

export async function ownsTask(
  userId: string,
  taskId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  return Boolean(row);
}

export async function ownsProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  return Boolean(row);
}
