"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  journalEntries,
  journalEntryPeople,
  journalEntryTags,
  people,
  tags,
} from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";
import { ensureJournalEntry } from "@/lib/server/journal";
import { extractJournalRefs } from "@/lib/server/parse-journal-refs";

const saveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  body: z.string().max(50000),
});

// Mentions come from parsing free text, so a stale or hand-typed person link
// shouldn't fail the save — keep only the ids that are the user's own people
// and silently drop the rest.
async function ownedPersonIds(
  userId: string,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.userId, userId), inArray(people.id, ids)));
  return rows.map((r) => r.id);
}

// Structured "[#name](/tags/<id>)" links carry a tag id straight from
// autocomplete — keep only ids that are the user's own meeting tags.
async function ownedMeetingTagIds(
  userId: string,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(
      and(
        eq(tags.userId, userId),
        eq(tags.kind, "meeting"),
        inArray(tags.id, ids),
      ),
    );
  return rows.map((r) => r.id);
}

// Find-or-create against the meeting tag vocabulary (kind = 'meeting') so the
// journal and meetings share one namespace. Case-insensitive so "#Budget" and
// "#budget" resolve to the same tag.
async function findOrCreateJournalTagIds(
  userId: string,
  names: string[],
): Promise<string[]> {
  if (names.length === 0) return [];
  const existing = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(
      and(
        eq(tags.userId, userId),
        eq(tags.kind, "meeting"),
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
        .values(
          missing.map((name) => ({ userId, name, kind: "meeting" as const })),
        )
        .returning({ id: tags.id, name: tags.name })
    : [];
  return [...existing, ...inserted].map((t) => t.id);
}

// Autosave target: deliberately no revalidatePath — re-rendering the page
// underneath a textarea the user is still typing into is wasted work, and the
// journal isn't shown anywhere else that could go stale.
export async function saveJournalBody(
  input: z.input<typeof saveSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { date, body } = parsed.data;

  const entryId = await ensureJournalEntry(userId, date);
  await db
    .update(journalEntries)
    .set({ body, updatedAt: new Date() })
    .where(eq(journalEntries.id, entryId));

  const { personIds, tagIds, tagNames } = extractJournalRefs(body);
  const validPersonIds = await ownedPersonIds(userId, personIds);
  const [linkedTagIds, createdTagIds] = await Promise.all([
    ownedMeetingTagIds(userId, tagIds),
    findOrCreateJournalTagIds(userId, tagNames),
  ]);
  const allTagIds = [...new Set([...linkedTagIds, ...createdTagIds])];

  // Atomic delete + re-insert of both junctions so a mid-write failure can't
  // leave the entry's mentions/tags half-reconciled.
  await db.batch([
    db
      .delete(journalEntryPeople)
      .where(eq(journalEntryPeople.entryId, entryId)),
    ...(validPersonIds.length
      ? [
          db
            .insert(journalEntryPeople)
            .values(validPersonIds.map((personId) => ({ entryId, personId }))),
        ]
      : []),
    db.delete(journalEntryTags).where(eq(journalEntryTags.entryId, entryId)),
    ...(allTagIds.length
      ? [
          db
            .insert(journalEntryTags)
            .values(allTagIds.map((tagId) => ({ entryId, tagId }))),
        ]
      : []),
  ]);

  return { ok: true };
}
