"use server";

import { and, count, eq, inArray, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { extractDueDate } from "@/lib/server/parse-due-date";
import {
  PriorityCapExceededError,
  ensureOpenReview,
  getOpenReviewId,
} from "@/lib/server/priority-cap";
import { weekStartIso } from "@/lib/time";

async function currentReviewId(userId: string): Promise<string> {
  return ensureOpenReview(userId);
}

// The week the open review covers. Project notes saved during a review file
// under this week, not necessarily the current calendar week — a reopened past
// review edits the notes for the week it covers.
async function currentReviewWeek(userId: string): Promise<string> {
  const reviewId = await ensureOpenReview(userId);
  const [row] = await db
    .select({ weekStartDate: weeklyReviews.weekStartDate })
    .from(weeklyReviews)
    .where(eq(weeklyReviews.id, reviewId));
  return row?.weekStartDate ?? weekStartIso();
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

// Autosave target: no revalidatePath — re-rendering /review underneath the
// textarea the user is typing into costs a full data reload per blur and
// nothing user-visible goes stale (same convention as the meetings notes).
export async function updateReflection(text: string): Promise<void> {
  const userId = await requireUserId();
  const reviewId = await currentReviewId(userId);
  await db
    .update(weeklyReviews)
    .set({ reflectionNotes: text })
    .where(eq(weeklyReviews.id, reviewId));
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

  const weekStartDate = await currentReviewWeek(userId);
  await db
    .insert(projectWeeklyNotes)
    .values({ projectId, weekStartDate, note: notes })
    .onConflictDoUpdate({
      target: [projectWeeklyNotes.projectId, projectWeeklyNotes.weekStartDate],
      set: { note: notes, updatedAt: new Date() },
    });
  // Autosave target: revalidate only the *other* page that shows this note —
  // re-rendering /review underneath the textarea being typed into is wasted
  // work on every blur.
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
  const seen = new Set<string>();
  const unique = tagNames.filter((n) => {
    const key = n.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { title, tagNames: unique };
}

async function findOrCreateTaskTagIds(
  userId: string,
  names: string[],
): Promise<string[]> {
  if (names.length === 0) return [];
  // Case-insensitive match: "#P1" must reuse an existing "p1" tag, since
  // priority derivation (and the tag chips) treat them as the same tag.
  const existing = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(
      and(
        eq(tags.userId, userId),
        eq(tags.kind, "task"),
        inArray(
          sql`lower(${tags.name})`,
          names.map((n) => n.toLowerCase()),
        ),
      ),
    );
  const existingNames = new Set(existing.map((t) => t.name.toLowerCase()));
  const missing = names.filter((n) => !existingNames.has(n.toLowerCase()));
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
  const { title: untagged, tagNames } = extractHashtags(input.title);
  const { title, dueDate } = extractDueDate(untagged);
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
      dueDate,
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

  const [agg] = await db
    .select({
      count: count(),
      // sort_order isn't read anywhere today, but a removed priority leaves
      // a gap — reusing count() as the next value can collide with a slot
      // that's still in use. max()+1 always lands on an unused value.
      maxSortOrder: max(weeklyPriorities.sortOrder),
    })
    .from(weeklyPriorities)
    .where(eq(weeklyPriorities.weeklyReviewId, reviewId));
  if (agg.count >= WEEKLY_PRIORITY_CAP) {
    return { ok: false, error: new PriorityCapExceededError("weekly").message };
  }
  await db.insert(weeklyPriorities).values({
    weeklyReviewId: reviewId,
    taskId,
    sortOrder: (agg.maxSortOrder ?? -1) + 1,
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

// Files the current (completed) review and opens a fresh blank one.
export async function startNewReview(): Promise<void> {
  const userId = await requireUserId();
  await ensureOpenReview(userId);
  revalidatePath("/review");
}

// Reopens a filed review back into the editor by clearing its completion.
// Only one review can be open at a time (partial unique index), so this is
// blocked while a different review is still in progress.
export async function reopenReview(
  reviewId: string,
): Promise<{ ok: false; error: string } | void> {
  const userId = await requireUserId();
  const [review] = await db
    .select({
      id: weeklyReviews.id,
      completedAt: weeklyReviews.completedAt,
    })
    .from(weeklyReviews)
    .where(
      and(eq(weeklyReviews.id, reviewId), eq(weeklyReviews.userId, userId)),
    );
  if (!review) return { ok: false, error: "Review not found." };

  if (review.completedAt) {
    const openId = await getOpenReviewId(userId);
    if (openId && openId !== reviewId) {
      return {
        ok: false,
        error: "Finish your in-progress review before reopening another.",
      };
    }
    await db
      .update(weeklyReviews)
      .set({ completedAt: null })
      .where(eq(weeklyReviews.id, reviewId));
    revalidatePath("/review/history");
  }
  revalidatePath("/review");
  redirect("/review");
}

export async function deleteReview(reviewId: string): Promise<void> {
  const userId = await requireUserId();
  // Cascades to weekly_priorities; project_weekly_notes are keyed by week, not
  // by review, so they're intentionally left intact.
  await db
    .delete(weeklyReviews)
    .where(
      and(eq(weeklyReviews.id, reviewId), eq(weeklyReviews.userId, userId)),
    );
  revalidatePath("/review/history");
  revalidatePath("/review");
  redirect("/review/history");
}
