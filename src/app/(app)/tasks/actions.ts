"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
