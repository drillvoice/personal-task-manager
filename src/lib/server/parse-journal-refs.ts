import "server-only";
import { findBareTagNames } from "@/lib/journal-tags";

const UUID = "[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}";

// A person mention is stored in the markdown body as a link the reader renders
// as "@Name": `[@Sarah Chen](/people/<uuid>)`. We pull the uuid back out to
// reconcile the journal_entry_people junction on save.
const PERSON_LINK_RE = new RegExp(`\\[@[^\\]]+\\]\\(/people/(${UUID})\\)`, "g");

// A tag chosen from autocomplete is stored the same structured way, carrying
// its id: `[#policy team](/tags/<uuid>)`. This is what lets multi-word meeting
// tags (which a bare "#word" token can't represent) round-trip.
const TAG_LINK_RE = new RegExp(`\\[#[^\\]]+\\]\\(/tags/(${UUID})\\)`, "g");

export type JournalRefs = {
  personIds: string[];
  tagIds: string[];
  /**
   * Bare "#word" tokens. Candidates only: they link to a tag when one of that
   * name already exists, and are display-only otherwise. Creating a tag takes
   * an explicit autocomplete choice — see saveJournalBody.
   */
  tagNames: string[];
};

export function extractJournalRefs(body: string): JournalRefs {
  const personIds = [...body.matchAll(PERSON_LINK_RE)].map((m) => m[1]);
  const tagIds = [...body.matchAll(TAG_LINK_RE)].map((m) => m[1]);
  return {
    personIds: [...new Set(personIds)],
    tagIds: [...new Set(tagIds)],
    tagNames: dedupeCaseInsensitive(findBareTagNames(body)),
  };
}

function dedupeCaseInsensitive(names: string[]): string[] {
  const seen = new Set<string>();
  return names.filter((n) => {
    const key = n.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
