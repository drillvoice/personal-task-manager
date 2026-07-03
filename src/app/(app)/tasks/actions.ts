"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { people, taskAssignees, tasks } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";

const nullableUuid = z
  .string()
  .uuid()
  .nullable()
  .or(z.literal("").transform(() => null));

const assigneeIds = z.array(z.string().uuid()).max(100).default([]);

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

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  projectId: nullableUuid,
  assigneeIds,
  meetingId: nullableUuid.default(null),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
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
  const { title, projectId, meetingId, priority, dueDate, status } =
    parsed.data;
  const uniqueAssignees = [...new Set(parsed.data.assigneeIds)];
  if (!(await ownedPersonIds(userId, uniqueAssignees))) {
    return { ok: false, error: "Unknown assignee" };
  }
  const [row] = await db
    .insert(tasks)
    .values({
      userId,
      title,
      projectId: projectId ?? null,
      meetingId: meetingId ?? null,
      priority,
      dueDate: dueDate ?? null,
      status,
    })
    .returning({ id: tasks.id });
  if (uniqueAssignees.length > 0) {
    await db.insert(taskAssignees).values(
      uniqueAssignees.map((personId) => ({ taskId: row.id, personId })),
    );
  }
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
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .or(z.literal("").transform(() => null)),
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
  const [updated] = await db
    .update(tasks)
    .set({
      title: parsed.data.title,
      projectId: parsed.data.projectId,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate,
    })
    .where(and(eq(tasks.id, parsed.data.id), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });
  if (!updated) return { ok: false, error: "Task not found" };
  await db.delete(taskAssignees).where(eq(taskAssignees.taskId, updated.id));
  if (uniqueAssignees.length > 0) {
    await db.insert(taskAssignees).values(
      uniqueAssignees.map((personId) => ({ taskId: updated.id, personId })),
    );
  }
  revalidatePath("/tasks");
  revalidatePath("/today");
  return { ok: true };
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
