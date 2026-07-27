import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  journalEntries,
  journalEntryPeople,
  journalEntryTags,
  people,
  tags,
} from "@/lib/db/schema";
import { loadPersonOptions } from "@/lib/server/people";
import { loadTagOptions } from "@/lib/server/meetings";
import type { ContactOption } from "@/lib/server/people";
import type { TagOption } from "@/lib/server/meetings";

export type JournalDay = {
  date: string;
  body: string;
  people: ContactOption[];
  tags: TagOption[];
};

// Read side never inserts: an unwritten day is a valid empty note. The row is
// created lazily on first save (see ensureJournalEntry / saveJournalBody).
export async function loadJournalEntry(
  userId: string,
  dateIso: string,
): Promise<JournalDay> {
  const [entry] = await db
    .select({ id: journalEntries.id, body: journalEntries.body })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        eq(journalEntries.entryDate, dateIso),
      ),
    );
  if (!entry) return { date: dateIso, body: "", people: [], tags: [] };

  const [peopleRows, tagRows] = await Promise.all([
    db
      .select({ id: people.id, name: people.name })
      .from(journalEntryPeople)
      .innerJoin(people, eq(journalEntryPeople.personId, people.id))
      .where(eq(journalEntryPeople.entryId, entry.id))
      .orderBy(asc(people.name)),
    db
      .select({ id: tags.id, name: tags.name, color: tags.color })
      .from(journalEntryTags)
      .innerJoin(tags, eq(journalEntryTags.tagId, tags.id))
      .where(eq(journalEntryTags.entryId, entry.id))
      .orderBy(asc(tags.name)),
  ]);

  return { date: dateIso, body: entry.body, people: peopleRows, tags: tagRows };
}

/**
 * Write the body for (user, date), creating the row if this is the first save,
 * and return its id.
 *
 * One statement rather than ensureDailyPlan's select → insert → re-select: over
 * the HTTP driver every statement is its own request, and this runs on an
 * 800ms autosave. It also makes creating the row atomic with writing the body,
 * and leans on journal_entries_user_date_uniq so two concurrent first-saves
 * still resolve to one row.
 */
export async function upsertJournalBody(
  userId: string,
  dateIso: string,
  body: string,
): Promise<string> {
  const [row] = await db
    .insert(journalEntries)
    .values({ userId, entryDate: dateIso, body })
    .onConflictDoUpdate({
      target: [journalEntries.userId, journalEntries.entryDate],
      set: { body, updatedAt: new Date() },
    })
    .returning({ id: journalEntries.id });
  return row.id;
}

// Autocomplete sources for the editor: the user's people and the shared
// meeting-tag vocabulary.
export async function loadJournalRefOptions(userId: string): Promise<{
  people: ContactOption[];
  tags: TagOption[];
}> {
  const [personOptions, tagOptions] = await Promise.all([
    loadPersonOptions(userId),
    loadTagOptions(userId),
  ]);
  return { people: personOptions, tags: tagOptions };
}
