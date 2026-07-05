"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, isUniqueViolation } from "@/lib/db";
import {
  projects,
  tasks,
  weeklyPriorities,
  weeklyReviews,
} from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";
import {
  PriorityCapExceededError,
  ensureWeeklyReview,
  reserveWeeklySlot,
} from "@/lib/server/priority-cap";
import { assertOwnsProject, assertOwnsTask } from "@/lib/server/ownership";
import { weekStartIso } from "@/lib/time";

const notesField = z.string().max(50000);

async function currentReviewId(userId: string): Promise<string> {
  return ensureWeeklyReview(userId, weekStartIso());
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

export async function updateReflection(
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = notesField.safeParse(text);
  if (!parsed.success) return { ok: false, error: "Reflection is too long" };
  const reviewId = await currentReviewId(userId);
  await db
    .update(weeklyReviews)
    .set({ reflectionNotes: parsed.data })
    .where(eq(weeklyReviews.id, reviewId));
  revalidatePath("/review");
  return { ok: true };
}

export async function updateProjectNotes(
  projectId: string,
  notes: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = notesField.safeParse(notes);
  if (!parsed.success) return { ok: false, error: "Notes are too long" };
  const [updated] = await db
    .update(projects)
    .set({ notes: parsed.data, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning({ id: projects.id });
  if (!updated) return { ok: false, error: "Project not found" };
  revalidatePath("/review");
  revalidatePath("/tasks");
  return { ok: true };
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

  let slot: number;
  try {
    slot = await reserveWeeklySlot(reviewId);
  } catch (err) {
    if (err instanceof PriorityCapExceededError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  try {
    await db.insert(weeklyPriorities).values({
      weeklyReviewId: reviewId,
      taskId,
      sortOrder: slot,
    });
  } catch (err) {
    // Lost a race: another toggle already added this task or took the slot.
    if (isUniqueViolation(err)) {
      return { ok: false, error: "Priorities just changed — try again." };
    }
    throw err;
  }
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
