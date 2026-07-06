"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  projectWeeklyNotes,
  projects,
  tags,
  taskTags,
  tasks,
  WEEKLY_PRIORITY_CAP,
  weeklyPriorities,
  weeklyReviews,
} from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";
import {
  PriorityCapExceededError,
  ensureWeeklyReview,
} from "@/lib/server/priority-cap";
import { weekStartIso } from "@/lib/time";

async function currentReviewId(userId: string): Promise<string> {
  return ensureWeeklyReview(userId, weekStartIso());
}

async function assertOwnsProject(userId: string, projectId: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  if (!row) throw new Error("Project not found");
}

async function assertOwnsTask(userId: string, taskId: string) {
  const [row] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  if (!row) throw new Error("Task not found");
}

export async function updateReviewFlag(
  field:
    | "inboxCleared"
    | "loopsCaptured"
    | "lastWeekCalendarReviewed"
    | "thisWeekCalendarReviewed",
  value: boolean,
): Promise<void> {
  const userId = await requireUserId();
  const reviewId = await currentReviewId(userId);
  await db
    .update(weeklyReviews)
    .set({ [field]: value })
    .where(eq(weeklyReviews.id, reviewId));
  revalidatePath("/review");
}

export async function updateReflection(text: string): Promise<void> {
  const userId = await requireUserId();
  const reviewId = await currentReviewId(userId);
  await db
    .update(weeklyReviews)
    .set({ reflectionNotes: text })
    .where(eq(weeklyReviews.id, reviewId));
  revalidatePath("/review");
}

export async function updateProjectNotes(
  projectId: string,
  notes: string,
): Promise<void> {
  const userId = await requireUserId();
  const [owned] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  if (!owned) throw new Error("Project not found");

  const weekStartDate = weekStartIso();
  await db
    .insert(projectWeeklyNotes)
    .values({ projectId, weekStartDate, note: notes })
    .onConflictDoUpdate({
      target: [projectWeeklyNotes.projectId, projectWeeklyNotes.weekStartDate],
      set: { note: notes, updatedAt: new Date() },
    });
  revalidatePath("/review");
  revalidatePath("/projects");
}

// Inline "#tag" tokens in a quick-capture title (e.g. "ring matthew #p1")
// are pulled out as task tags rather than left in the title.
const HASHTAG_RE = /#([a-zA-Z0-9_-]+)/g;

function extractHashtags(rawTitle: string): {
  title: string;
  tagNames: string[];
} {
  const tagNames = [...rawTitle.matchAll(HASHTAG_RE)].map((m) => m[1]);
  const title = rawTitle.replace(HASHTAG_RE, "").replace(/\s+/g, " ").trim();
  return { title, tagNames: [...new Set(tagNames)] };
}

async function findOrCreateTaskTagIds(
  userId: string,
  names: string[],
): Promise<string[]> {
  if (names.length === 0) return [];
  const existing = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(
      and(
        eq(tags.userId, userId),
        eq(tags.kind, "task"),
        inArray(tags.name, names),
      ),
    );
  const existingNames = new Set(existing.map((t) => t.name));
  const missing = names.filter((n) => !existingNames.has(n));
  const inserted = missing.length
    ? await db
        .insert(tags)
        .values(missing.map((name) => ({ userId, name, kind: "task" as const })))
        .returning({ id: tags.id, name: tags.name })
    : [];
  return [...existing, ...inserted].map((t) => t.id);
}

const quickAddSchema = z.object({
  title: z.string().trim().min(1).max(200),
  projectId: z.string().uuid().nullable(),
});

export async function quickAddTask(input: {
  title: string;
  projectId: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const { title, tagNames } = extractHashtags(input.title);
  const parsed = quickAddSchema.safeParse({ title, projectId: input.projectId });
  if (!parsed.success) return { ok: false, error: "Invalid title" };
  if (parsed.data.projectId) {
    await assertOwnsProject(userId, parsed.data.projectId);
  }
  const [row] = await db
    .insert(tasks)
    .values({
      userId,
      title: parsed.data.title,
      projectId: parsed.data.projectId,
      priority: 3,
      status: parsed.data.projectId ? "next_action" : "inbox",
    })
    .returning({ id: tasks.id });
  const tagIds = await findOrCreateTaskTagIds(userId, tagNames);
  if (tagIds.length > 0) {
    await db
      .insert(taskTags)
      .values(tagIds.map((tagId) => ({ taskId: row.id, tagId })));
  }
  revalidatePath("/review");
  revalidatePath("/tasks");
  revalidatePath("/today");
  return { ok: true };
}

export async function toggleWeeklyPriority(
  taskId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  await assertOwnsTask(userId, taskId);
  const reviewId = await currentReviewId(userId);

  const [existing] = await db
    .select({ id: weeklyPriorities.id })
    .from(weeklyPriorities)
    .where(
      and(
        eq(weeklyPriorities.weeklyReviewId, reviewId),
        eq(weeklyPriorities.taskId, taskId),
      ),
    );

  if (existing) {
    await db
      .delete(weeklyPriorities)
      .where(eq(weeklyPriorities.id, existing.id));
    revalidatePath("/review");
    return { ok: true };
  }

  const [existingCount] = await db
    .select({ value: count() })
    .from(weeklyPriorities)
    .where(eq(weeklyPriorities.weeklyReviewId, reviewId));
  if (existingCount.value >= WEEKLY_PRIORITY_CAP) {
    return { ok: false, error: new PriorityCapExceededError("weekly").message };
  }
  await db.insert(weeklyPriorities).values({
    weeklyReviewId: reviewId,
    taskId,
    sortOrder: existingCount.value,
  });
  revalidatePath("/review");
  return { ok: true };
}

export async function finishReview(): Promise<void> {
  const userId = await requireUserId();
  const reviewId = await currentReviewId(userId);
  await db
    .update(weeklyReviews)
    .set({ completedAt: new Date() })
    .where(eq(weeklyReviews.id, reviewId));
  revalidatePath("/review");
  revalidatePath("/review/history");
}
