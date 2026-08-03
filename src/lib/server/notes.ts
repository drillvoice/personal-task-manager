import "server-only";
import { and, desc, eq, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { escapeLikePattern } from "@/lib/notes-search";

export type NoteRow = {
  id: string;
  body: string;
  updatedAt: Date;
};

// A ceiling rather than paging: this is a personal filing cabinet, and anything
// past the first couple of hundred is reached by searching, not by scrolling.
const NOTE_LIMIT = 200;

/**
 * Notes for `userId`, newest first, optionally filtered to those whose body
 * contains `query`.
 *
 * Substring ILIKE rather than full-text: it matches part-words as the user
 * types, and it matches a literal "#polling" — notes have no tag rows, so a
 * hashtag is only ever found as text.
 */
export async function loadNotes(
  userId: string,
  query?: string,
): Promise<NoteRow[]> {
  const trimmed = query?.trim() ?? "";
  return db
    .select({ id: notes.id, body: notes.body, updatedAt: notes.updatedAt })
    .from(notes)
    .where(
      trimmed
        ? and(
            eq(notes.userId, userId),
            ilike(notes.body, `%${escapeLikePattern(trimmed)}%`),
          )
        : eq(notes.userId, userId),
    )
    .orderBy(desc(notes.updatedAt))
    .limit(NOTE_LIMIT);
}
