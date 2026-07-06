import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { tags, taskTags } from "@/lib/db/schema";
import { priorityFromTagNames } from "@/lib/priority";
import type { Priority } from "@/lib/types";

/**
 * Map of taskId -> derived priority for every task tagged p1/p2/p3.
 * Tasks absent from the map are untagged (no priority).
 *
 * Used by views (Today, Review) that don't already fetch each task's full
 * tag list. Views that do (Tasks, Meetings) derive priority directly from
 * that list instead — see `priorityFromTagNames`.
 */
export async function loadTaskPriorities(
  userId: string,
): Promise<Map<string, Priority>> {
  const userTags = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(and(eq(tags.userId, userId), eq(tags.kind, "task")));

  const priorityByTagId = new Map<string, Priority>();
  for (const t of userTags) {
    const p = priorityFromTagNames([t.name]);
    if (p !== null) priorityByTagId.set(t.id, p);
  }
  if (priorityByTagId.size === 0) return new Map();

  const rows = await db
    .select({ taskId: taskTags.taskId, tagId: taskTags.tagId })
    .from(taskTags)
    .where(inArray(taskTags.tagId, [...priorityByTagId.keys()]));

  const result = new Map<string, Priority>();
  for (const r of rows) {
    const p = priorityByTagId.get(r.tagId)!;
    const existing = result.get(r.taskId);
    if (existing === undefined || p < existing) result.set(r.taskId, p);
  }
  return result;
}
