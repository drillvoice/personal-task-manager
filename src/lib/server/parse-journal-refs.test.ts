import { describe, expect, it } from "vitest";
import { extractJournalRefs } from "./parse-journal-refs";

const UUID_A = "11111111-1111-1111-1111-111111111111";
const UUID_B = "22222222-2222-2222-2222-222222222222";
const UUID_C = "33333333-3333-3333-3333-333333333333";

describe("extractJournalRefs", () => {
  it("pulls person uuids out of @-mention links", () => {
    const body = `- Emailed [@Sarah Chen](/people/${UUID_A}) about budget
- Called [@Tom](/people/${UUID_B})`;
    const { personIds } = extractJournalRefs(body);
    expect(personIds).toEqual([UUID_A, UUID_B]);
  });

  it("dedupes a person mentioned twice", () => {
    const body = `[@Sarah](/people/${UUID_A}) then later [@Sarah](/people/${UUID_A})`;
    expect(extractJournalRefs(body).personIds).toEqual([UUID_A]);
  });

  it("collects inline #tags", () => {
    const { tagNames } = extractJournalRefs("spoke re #budget and #NSW-north");
    expect(tagNames).toEqual(["budget", "NSW-north"]);
  });

  it("pulls tag uuids out of structured #-tag links (incl. multi-word)", () => {
    const body = `noted [#policy team](/tags/${UUID_C}) and a bare #adhoc`;
    const refs = extractJournalRefs(body);
    expect(refs.tagIds).toEqual([UUID_C]);
    // the "#policy team" link text is not double-counted as a bare tag
    expect(refs.tagNames).toEqual(["adhoc"]);
  });

  it("does not treat markdown headings as tags", () => {
    const body = `# Monday
## Afternoon
- real #tag here`;
    expect(extractJournalRefs(body).tagNames).toEqual(["tag"]);
  });

  it("dedupes tags case-insensitively, keeping first casing", () => {
    expect(extractJournalRefs("#Budget then #budget").tagNames).toEqual([
      "Budget",
    ]);
  });

  it("finds tags even when indented under bullets", () => {
    const body = `- call
    - note #followup`;
    expect(extractJournalRefs(body).tagNames).toEqual(["followup"]);
  });

  it("returns empty arrays for a plain note", () => {
    expect(extractJournalRefs("just some plain text")).toEqual({
      personIds: [],
      tagIds: [],
      tagNames: [],
    });
  });

  it("ignores tokens inside a fenced code block", () => {
    const body = [
      "pasted the config:",
      "```c",
      "#include <stdio.h>",
      "#define MAX 10",
      "```",
      "then tagged it #infra",
    ].join("\n");
    expect(extractJournalRefs(body).tagNames).toEqual(["infra"]);
  });

  it("ignores tokens inside a tilde fence and resumes after it", () => {
    const body = ["~~~css", "#sidebar { color: red; }", "~~~", "#done"].join(
      "\n",
    );
    expect(extractJournalRefs(body).tagNames).toEqual(["done"]);
  });

  it("ignores tokens inside an inline code span", () => {
    const body = "use `#budget` for the rollup, tag it #finance";
    expect(extractJournalRefs(body).tagNames).toEqual(["finance"]);
  });

  it("does not treat an all-numeric token as a tag", () => {
    const body = "closes #123 and #1 — real one is #q3";
    expect(extractJournalRefs(body).tagNames).toEqual(["q3"]);
  });

  it("does not treat a url fragment as a tag", () => {
    const body = "ref https://example.com/doc#section2 and #notes";
    expect(extractJournalRefs(body).tagNames).toEqual(["notes"]);
  });

  it("ignores a malformed uuid in a person link", () => {
    const body = `[@Ghost](/people/${"-".repeat(36)}) and [@Real](/people/${UUID_A})`;
    expect(extractJournalRefs(body).personIds).toEqual([UUID_A]);
  });
});
