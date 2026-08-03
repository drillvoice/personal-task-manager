"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectWeeklyNotes, projects } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";
import { ownsProject } from "@/lib/server/ownership";
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

const renameSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(200),
});

export async function renameProject(
  input: z.input<typeof renameSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const [updated] = await db
    .update(projects)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(
      and(eq(projects.id, parsed.data.projectId), eq(projects.userId, userId)),
    )
    .returning({ id: projects.id });
  if (!updated) return { ok: false, error: "Project not found" };
  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath("/review");
  return { ok: true };
}

// `on_hold` and `completed` exist in the enum but have no defined behaviour
// anywhere, so they stay unreachable from the UI.
const statusSchema = z.object({
  projectId: z.string().uuid(),
  status: z.enum(["active", "someday_maybe", "archived"]),
});

export async function updateProjectStatus(
  input: z.input<typeof statusSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const [updated] = await db
    .update(projects)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(
      and(eq(projects.id, parsed.data.projectId), eq(projects.userId, userId)),
    )
    .returning({ id: projects.id });
  if (!updated) return { ok: false, error: "Project not found" };
  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath("/review");
  return { ok: true };
}

const currentNotesSchema = z.object({
  projectId: z.string().uuid(),
  notes: z.string().max(50000),
});

// The project's *current* narrative (spec §4.C) — distinct from the weekly
// snapshots. Autosave target: no revalidatePath (same convention as the
// meetings notes); the textarea's own state is the source of truth while
// editing, and force-dynamic pages refetch on navigation.
export async function updateProjectCurrentNotes(
  input: z.input<typeof currentNotesSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = currentNotesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const [updated] = await db
    .update(projects)
    .set({ notes: parsed.data.notes, updatedAt: new Date() })
    .where(
      and(eq(projects.id, parsed.data.projectId), eq(projects.userId, userId)),
    )
    .returning({ id: projects.id });
  if (!updated) return { ok: false, error: "Project not found" };
  return { ok: true };
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

  if (!(await ownsProject(userId, parsed.data.projectId))) {
    return { ok: false, error: "Project not found" };
  }

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

  // Autosave target (history-table cells): revalidate only the other page
  // that shows this note, not the /projects page under the cell being edited.
  revalidatePath("/review");
  return { ok: true };
}
