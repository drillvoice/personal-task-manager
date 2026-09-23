"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { people, tags, taskAssignees, taskTags, tasks } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";
import { extractDueDate } from "@/lib/server/parse-due-date";
import { ownsTask } from "@/lib/server/ownership";
import { reactivateArchivedProject } from "@/lib/server/reactivate-project";

const nullableUuid = z
  .string()
  .uuid()
  .nullable()
  .or(z.literal("").transform(() => null));

const assigneeIds = z.array(z.string().uuid()).max(100).default([]);
const tagIds = z.array(z.string().uuid()).max(100).default([]);

// Junction rows carry no userId, so submitted ids must be checked against the
// user's own people before inserting.
async function ownedPersonIds(userId: string, ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const rows = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.userId, userId), inArray(people.id, ids)));
  return rows.length === ids.length;
}

async function ownedTaskTagIds(
  userId: string,
  ids: string[],
): Promise<boolean> {
  if (ids.length === 0) return true;
  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(
      and(eq(tags.userId, userId), eq(tags.kind, "task"), inArray(tags.id, ids)),
    );
  return rows.length === ids.length;
}

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  projectId: nullableUuid,
  assigneeIds,
  tagIds,
  meetingId: nullableUuid.default(null),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .or(z.literal("").transform(() => null)),
  status: z.enum(["inbox", "next_action", "waiting_on"]),
});

export type CreateTaskInput = z.input<typeof createSchema>;

export async function createTask(input: CreateTaskInput): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const userId = await requireUserId();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { projectId, meetingId, status } = parsed.data;
  // An explicit date-picker value wins; only mine the title when it's blank.
  const { title, dueDate } = parsed.data.dueDate
    ? { title: parsed.data.title, dueDate: parsed.data.dueDate }
    : extractDueDate(parsed.data.title);
  const uniqueAssignees = [...new Set(parsed.data.assigneeIds)];
  const uniqueTags = [...new Set(parsed.data.tagIds)];
  const [assigneesOk, tagsOk] = await Promise.all([
    ownedPersonIds(userId, uniqueAssignees),
    ownedTaskTagIds(userId, uniqueTags),
  ]);
  if (!assigneesOk) return { ok: false, error: "Unknown assignee" };
  if (!tagsOk) return { ok: false, error: "Unknown tag" };
  // Pre-generated id lets the task and its junction rows land in one batch
  // (a single implicit transaction over neon-http), so a mid-write failure
  // can't leave a task missing its tags or assignees.
  const taskId = crypto.randomUUID();
  await db.batch([
    db.insert(tasks).values({
      id: taskId,
      userId,
      title,
      projectId: projectId ?? null,
      meetingId: meetingId ?? null,
      dueDate: dueDate ?? null,
      status,
    }),
    ...(uniqueAssignees.length > 0
      ? [
          db.insert(taskAssignees).values(
            uniqueAssignees.map((personId) => ({ taskId, personId })),
          ),
        ]
      : []),
    ...(uniqueTags.length > 0
      ? [
          db.insert(taskTags).values(
            uniqueTags.map((tagId) => ({ taskId, tagId })),
          ),
        ]
      : []),
  ]);
  await reactivateArchivedProject(userId, projectId);
  revalidatePath("/tasks");
  revalidatePath("/today");
  revalidatePath("/projects");
  if (meetingId) revalidatePath(`/meetings/${meetingId}`);
  return { ok: true };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(200),
  projectId: nullableUuid,
  assigneeIds,
  tagIds,
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .or(z.literal("").transform(() => null)),
  // Optional so callers that predate notes (inline EditTaskForm) never clobber it.
  notes: z.string().max(20000).optional(),
});

export type UpdateTaskInput = z.input<typeof updateSchema>;

export async function updateTask(
  input: UpdateTaskInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const taskId = parsed.data.id;
  const uniqueAssignees = [...new Set(parsed.data.assigneeIds)];
  const uniqueTags = [...new Set(parsed.data.tagIds)];
  // Every check up front in one parallel round, so the write itself can be a
  // single batch: this runs on each field change in the task detail panel.
  const [owned, assigneesOk, tagsOk] = await Promise.all([
    ownsTask(userId, taskId),
    ownedPersonIds(userId, uniqueAssignees),
    ownedTaskTagIds(userId, uniqueTags),
  ]);
  if (!owned) return { ok: false, error: "Task not found" };
  if (!assigneesOk) return { ok: false, error: "Unknown assignee" };
  if (!tagsOk) return { ok: false, error: "Unknown tag" };
  // Delete + re-insert must be atomic — a failure in between would strip the
  // task's tags (including its priority). db.batch runs as one transaction.
  await db.batch([
    db
      .update(tasks)
      .set({
        title: parsed.data.title,
        projectId: parsed.data.projectId,
        dueDate: parsed.data.dueDate,
        ...(parsed.data.notes !== undefined
          ? { notes: parsed.data.notes }
          : {}),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))),
    db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId)),
    db.delete(taskTags).where(eq(taskTags.taskId, taskId)),
    ...(uniqueAssignees.length > 0
      ? [
          db.insert(taskAssignees).values(
            uniqueAssignees.map((personId) => ({ taskId, personId })),
          ),
        ]
      : []),
    ...(uniqueTags.length > 0
      ? [
          db.insert(taskTags).values(
            uniqueTags.map((tagId) => ({ taskId, tagId })),
          ),
        ]
      : []),
  ]);
  await reactivateArchivedProject(userId, parsed.data.projectId);
  revalidatePath("/tasks");
  revalidatePath("/today");
  revalidatePath("/projects");
  return { ok: true };
}

const notesSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().max(20000),
});

// Autosave target: no revalidatePath, and independent of the other task
// fields — a half-edited title can't invalidate a notes save, and the page
// under the textarea isn't re-rendered on every debounce.
export async function updateTaskNotes(
  input: z.input<typeof notesSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const [updated] = await db
    .update(tasks)
    .set({ notes: parsed.data.notes })
    .where(and(eq(tasks.id, parsed.data.id), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });
  if (!updated) return { ok: false, error: "Task not found" };
  return { ok: true };
}

const createTagSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
});

export async function createTaskTag(
  input: z.input<typeof createTagSchema>,
): Promise<
  | { ok: true; id: string; name: string; color: string }
  | { ok: false; error: string }
> {
  const userId = await requireUserId();
  const parsed = createTagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  // Dedupe case-insensitively: priority derivation treats "P1" and "p1" as
  // the same tag, so creation must too or they become duplicate chips.
  const name = parsed.data.name;
  const [existing] = await db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(tags)
    .where(
      and(
        eq(tags.userId, userId),
        eq(tags.kind, "task"),
        eq(sql`lower(${tags.name})`, name.toLowerCase()),
      ),
    );
  if (existing) return { ok: true, ...existing };
  const [row] = await db
    .insert(tags)
    .values({ userId, name, kind: "task" })
    .returning({ id: tags.id, name: tags.name, color: tags.color });
  revalidatePath("/tasks");
  return { ok: true, ...row };
}

export async function deleteTask(
  taskId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const [deleted] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });
  if (!deleted) return { ok: false, error: "Task not found" };
  revalidatePath("/tasks");
  revalidatePath("/today");
  // Same set create/update touch: a deleted task also leaves a project's task
  // list and, if it was a weekly priority, the review's x/3 count.
  revalidatePath("/projects");
  revalidatePath("/review");
  return { ok: true };
}
