"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";

const bodySchema = z.string().max(50000);

const createSchema = z.object({
  body: bodySchema.refine((b) => b.trim().length > 0, "Note is empty"),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  body: bodySchema,
});

const deleteSchema = z.object({ id: z.string().uuid() });

export async function createNote(
  input: z.input<typeof createSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  await db.insert(notes).values({ userId, body: parsed.data.body.trim() });
  revalidatePath("/notes");
  return { ok: true };
}

// Autosave target: deliberately no revalidatePath — re-rendering the list
// underneath a textarea the user is still typing into is wasted work, and over
// the HTTP driver each of those renders is a fresh round of queries.
export async function updateNoteBody(
  input: z.input<typeof updateSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { id, body } = parsed.data;

  // Scoped on userId as well as id, so an id belonging to another account
  // updates nothing rather than erroring.
  await db
    .update(notes)
    .set({ body, updatedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)));
  return { ok: true };
}

export async function deleteNote(
  input: z.input<typeof deleteSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  await db
    .delete(notes)
    .where(and(eq(notes.id, parsed.data.id), eq(notes.userId, userId)));
  revalidatePath("/notes");
  return { ok: true };
}
