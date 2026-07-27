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
  // Names the user explicitly chose to create from the "#" autocomplete. Only
  // these may mint a tag row; see resolveBareTagIds.
  createTagNames: z.array(z.string().min(1).max(80)).max(20).optional(),
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

/**
 * Resolve bare "#word" tokens against the meeting tag vocabulary
 * (kind = 'meeting') so the journal and meetings share one namespace.
 * Case-insensitive, so "#Budget" and "#budget" are the same tag.
 *
 * A bare token never creates a tag on its own. Autosave fires mid-word, so
 * pausing while typing "#budget" would otherwise mint "#b", "#bu", "#bud" as
 * permanent rows in a vocabulary the Meetings view also reads, and nothing in
 * the app deletes tags. Creation requires an explicit "Create #name" choice in
 * the autocomplete, which arrives as `createTagNames`; an unmatched token
 * without that intent is display-only.
 */
async function resolveBareTagIds(
  userId: string,
  names: string[],
  createNames: string[],
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
  const idByName = new Map(
    existing.map((t) => [t.name.toLowerCase(), t.id] as const),
  );
  const requested = new Set(createNames.map((n) => n.toLowerCase()));
  const toCreate = names.filter(
    (n) => !idByName.has(n.toLowerCase()) && requested.has(n.toLowerCase()),
  );

  // onConflictDoNothing: a concurrent save (second tab, or an overlapping
  // autosave) may have inserted the same name against tags_user_kind_name_uniq.
  // Losing the race costs this save the link, not the save — the token resolves
  // by name on the next one.
  const inserted = toCreate.length
    ? await db
        .insert(tags)
        .values(
          toCreate.map((name) => ({ userId, name, kind: "meeting" as const })),
        )
        .onConflictDoNothing()
        .returning({ id: tags.id })
    : [];
  return [...idByName.values(), ...inserted.map((t) => t.id)];
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
  const { date, body, createTagNames = [] } = parsed.data;

  const entryId = await ensureJournalEntry(userId, date);
  await db
    .update(journalEntries)
    .set({ body, updatedAt: new Date() })
    .where(eq(journalEntries.id, entryId));

  const { personIds, tagIds, tagNames } = extractJournalRefs(body);
  const validPersonIds = await ownedPersonIds(userId, personIds);
  const [linkedTagIds, bareTagIds] = await Promise.all([
    ownedMeetingTagIds(userId, tagIds),
    resolveBareTagIds(userId, tagNames, createTagNames),
  ]);
  const allTagIds = [...new Set([...linkedTagIds, ...bareTagIds])];

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
