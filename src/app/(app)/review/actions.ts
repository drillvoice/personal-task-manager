"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  projects,
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
  field: "inboxCleared" | "loopsCaptured",
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
  const [updated] = await db
    .update(projects)
    .set({ notes, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning({ id: projects.id });
  if (!updated) throw new Error("Project not found");
  revalidatePath("/review");
  revalidatePath("/tasks");
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
  const parsed = quickAddSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid title" };
  if (parsed.data.projectId) {
    await assertOwnsProject(userId, parsed.data.projectId);
  }
  await db.insert(tasks).values({
    userId,
    title: parsed.data.title,
    projectId: parsed.data.projectId,
    priority: 3,
    status: parsed.data.projectId ? "next_action" : "inbox",
  });
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
