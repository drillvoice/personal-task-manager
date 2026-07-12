"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { people, tags, taskAssignees, taskTags, tasks } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";

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
  const { title, projectId, meetingId, dueDate, status } = parsed.data;
  const uniqueAssignees = [...new Set(parsed.data.assigneeIds)];
  if (!(await ownedPersonIds(userId, uniqueAssignees))) {
    return { ok: false, error: "Unknown assignee" };
  }
  const uniqueTags = [...new Set(parsed.data.tagIds)];
  if (!(await ownedTaskTagIds(userId, uniqueTags))) {
    return { ok: false, error: "Unknown tag" };
  }
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
  revalidatePath("/tasks");
  revalidatePath("/today");
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
  const uniqueAssignees = [...new Set(parsed.data.assigneeIds)];
  if (!(await ownedPersonIds(userId, uniqueAssignees))) {
    return { ok: false, error: "Unknown assignee" };
  }
  const uniqueTags = [...new Set(parsed.data.tagIds)];
  if (!(await ownedTaskTagIds(userId, uniqueTags))) {
    return { ok: false, error: "Unknown tag" };
  }
  const [updated] = await db
    .update(tasks)
    .set({
      title: parsed.data.title,
      projectId: parsed.data.projectId,
      dueDate: parsed.data.dueDate,
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    })
    .where(and(eq(tasks.id, parsed.data.id), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });
  if (!updated) return { ok: false, error: "Task not found" };
  // Delete + re-insert must be atomic — a failure in between would strip the
  // task's tags (including its priority). db.batch runs as one transaction.
  await db.batch([
    db.delete(taskAssignees).where(eq(taskAssignees.taskId, updated.id)),
    db.delete(taskTags).where(eq(taskTags.taskId, updated.id)),
    ...(uniqueAssignees.length > 0
      ? [
          db.insert(taskAssignees).values(
            uniqueAssignees.map((personId) => ({ taskId: updated.id, personId })),
          ),
        ]
      : []),
    ...(uniqueTags.length > 0
      ? [
          db.insert(taskTags).values(
            uniqueTags.map((tagId) => ({ taskId: updated.id, tagId })),
          ),
        ]
      : []),
  ]);
  revalidatePath("/tasks");
  revalidatePath("/today");
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
  return { ok: true };
}
