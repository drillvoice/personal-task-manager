"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectWeeklyNotes, projects } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";
import { weekStartFromIso } from "@/lib/time";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  status: z.enum(["active", "someday_maybe"]),
});

export async function createProject(input: {
  name: string;
  status: "active" | "someday_maybe";
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const [row] = await db
    .insert(projects)
    .values({
      userId,
      name: parsed.data.name,
      status: parsed.data.status,
    })
    .returning({ id: projects.id });
  revalidatePath("/projects");
  revalidatePath("/tasks");
  return { ok: true, id: row.id };
}

const noteSchema = z.object({
  projectId: z.string().uuid(),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string(),
});

export async function upsertWeeklyNote(input: {
  projectId: string;
  weekStartDate: string;
  note: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  const [owned] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, parsed.data.projectId),
        eq(projects.userId, userId),
      ),
    );
  if (!owned) return { ok: false, error: "Project not found" };

  const week = weekStartFromIso(parsed.data.weekStartDate);

  await db
    .insert(projectWeeklyNotes)
    .values({
      projectId: parsed.data.projectId,
      weekStartDate: week,
      note: parsed.data.note,
    })
    .onConflictDoUpdate({
      target: [
        projectWeeklyNotes.projectId,
        projectWeeklyNotes.weekStartDate,
      ],
      set: { note: parsed.data.note, updatedAt: new Date() },
    });

  revalidatePath("/projects");
  revalidatePath("/review");
  return { ok: true };
}
