import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tags, taskTags } from "@/lib/db/schema";
import { PRIORITY_TAG_NAMES, priorityFromTagNames } from "@/lib/priority";
import type { Priority } from "@/lib/types";

/**
 * Map of taskId -> derived priority for every task tagged p1/p2/p3.
 * Tasks absent from the map are untagged (no priority).
 *
 * Used by views (Today, Review) that don't already fetch each task's full
 * tag list. Views that do (Tasks, Meetings) derive priority directly from
 * that list instead — see `priorityFromTagNames`.
 *
 * One joined query rather than tags-then-task_tags: over the HTTP driver each
 * statement is its own request, and this sits on the Today and Review render
 * paths.
 */
export async function loadTaskPriorities(
  userId: string,
): Promise<Map<string, Priority>> {
  const rows = await db
    .select({ taskId: taskTags.taskId, name: tags.name })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(
      and(
        eq(tags.userId, userId),
        eq(tags.kind, "task"),
        inArray(sql`lower(${tags.name})`, PRIORITY_TAG_NAMES),
      ),
    );

  const result = new Map<string, Priority>();
  for (const r of rows) {
    const p = priorityFromTagNames([r.name]);
    if (p === null) continue;
    const existing = result.get(r.taskId);
    if (existing === undefined || p < existing) result.set(r.taskId, p);
  }
  return result;
}
