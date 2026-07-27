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
import { loadContactOptions } from "@/lib/server/people";
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
 * Journal-entry id for (user, date), creating one if none exists. Same
 * select → insert-on-conflict-do-nothing → re-select shape as ensureDailyPlan,
 * so two concurrent first-saves resolve to the one row.
 */
export async function ensureJournalEntry(
  userId: string,
  dateIso: string,
): Promise<string> {
  const [existing] = await db
    .select({ id: journalEntries.id })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        eq(journalEntries.entryDate, dateIso),
      ),
    );
  if (existing) return existing.id;
  const [row] = await db
    .insert(journalEntries)
    .values({ userId, entryDate: dateIso })
    .onConflictDoNothing()
    .returning({ id: journalEntries.id });
  if (row) return row.id;
  const [raced] = await db
    .select({ id: journalEntries.id })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        eq(journalEntries.entryDate, dateIso),
      ),
    );
  return raced.id;
}

// Autocomplete sources for the editor: the user's people and the shared
// meeting-tag vocabulary.
export async function loadJournalRefOptions(userId: string): Promise<{
  people: ContactOption[];
  tags: TagOption[];
}> {
  const [contacts, tagOptions] = await Promise.all([
    loadContactOptions(userId),
    loadTagOptions(userId),
  ]);
  return { people: contacts.people, tags: tagOptions };
}
