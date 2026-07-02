"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";

const nullableUuid = z
  .string()
  .uuid()
  .nullable()
  .or(z.literal("").transform(() => null));

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  projectId: nullableUuid,
  personId: nullableUuid.default(null),
  orgId: nullableUuid.default(null),
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
  const { title, projectId, personId, orgId, priority, dueDate, status } =
    parsed.data;
  await db.insert(tasks).values({
    userId,
    title,
    projectId: projectId ?? null,
    personId: personId ?? null,
    organisationId: orgId ?? null,
    priority,
    dueDate: dueDate ?? null,
    status,
  });
  revalidatePath("/tasks");
  revalidatePath("/today");
  return { ok: true };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(200),
  projectId: nullableUuid,
  personId: nullableUuid.default(null),
  orgId: nullableUuid.default(null),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export async function updateTask(input: {
  id: string;
  title: string;
  projectId: string;
  personId?: string;
  orgId?: string;
  priority: 1 | 2 | 3;
  dueDate: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const [updated] = await db
    .update(tasks)
    .set({
      title: parsed.data.title,
      projectId: parsed.data.projectId,
      personId: parsed.data.personId,
      organisationId: parsed.data.orgId,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate,
    })
    .where(and(eq(tasks.id, parsed.data.id), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });
  if (!updated) return { ok: false, error: "Task not found" };
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
