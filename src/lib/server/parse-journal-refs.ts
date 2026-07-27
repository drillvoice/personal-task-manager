import "server-only";

// A person mention is stored in the markdown body as a link the reader renders
// as "@Name": `[@Sarah Chen](/people/<uuid>)`. We pull the uuid back out to
// reconcile the journal_entry_people junction on save.
const PERSON_LINK_RE = /\[@[^\]]+\]\(\/people\/([0-9a-fA-F-]{36})\)/g;

// A tag chosen from autocomplete is stored the same structured way, carrying
// its id: `[#policy team](/tags/<uuid>)`. This is what lets multi-word meeting
// tags (which a bare "#word" token can't represent) round-trip.
const TAG_LINK_RE = /\[#[^\]]+\]\(\/tags\/([0-9a-fA-F-]{36})\)/g;

// Bare inline "#tag" tokens for quick single-word tagging / creating a new tag.
// The tag must sit at a start/whitespace boundary, which (a) keeps
// "example.com#frag" in a URL from being read as a tag, (b) skips the "#Name"
// inside a `[#Name](...)` link (preceded by "["), and (c) lets the reader chip
// exactly the same tokens. A heading marker ("# ", "## ") is a '#' followed by
// whitespace, so requiring a word char right after '#' already skips headings.
export const JOURNAL_TAG_RE = /(^|\s)#([a-zA-Z0-9_-]+)/g;

export type JournalRefs = {
  personIds: string[];
  tagIds: string[];
  tagNames: string[];
};

export function extractJournalRefs(body: string): JournalRefs {
  const personIds = [...body.matchAll(PERSON_LINK_RE)].map((m) => m[1]);
  const tagIds = [...body.matchAll(TAG_LINK_RE)].map((m) => m[1]);
  const tagNames = [...body.matchAll(JOURNAL_TAG_RE)].map((m) => m[2]);
  return {
    personIds: [...new Set(personIds)],
    tagIds: [...new Set(tagIds)],
    tagNames: dedupeCaseInsensitive(tagNames),
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
