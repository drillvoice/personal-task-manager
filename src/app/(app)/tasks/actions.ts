"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  projectId: z
    .string()
    .uuid()
    .nullable()
    .or(z.literal("").transform(() => null)),
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
  const { title, projectId, priority, dueDate, status } = parsed.data;
  await db.insert(tasks).values({
    userId,
    title,
    projectId: projectId ?? null,
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
  projectId: z
    .string()
    .uuid()
    .nullable()
    .or(z.literal("").transform(() => null)),
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
  priority: 1 | 2 | 3;
  dueDate: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const [owned] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, parsed.data.id), eq(tasks.userId, userId)));
  if (!owned) return { ok: false, error: "Task not found" };
  await db
    .update(tasks)
    .set({
      title: parsed.data.title,
      projectId: parsed.data.projectId,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate,
    })
    .where(eq(tasks.id, parsed.data.id));
  revalidatePath("/tasks");
  revalidatePath("/today");
  return { ok: true };
}

export async function deleteTask(
  taskId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const [owned] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  if (!owned) return { ok: false, error: "Task not found" };
  await db.delete(tasks).where(eq(tasks.id, taskId));
  revalidatePath("/tasks");
  revalidatePath("/today");
  return { ok: true };
}
