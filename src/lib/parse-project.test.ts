import { describe, expect, it } from "vitest";
import { activeProjectToken, extractProject } from "./parse-project";

const PROJECTS = [
  { id: "nsw", name: "NSW" },
  { id: "housing", name: "Housing" },
  { id: "housing-policy", name: "Housing Policy" },
];

describe("extractProject", () => {
  it("resolves a single-word project and strips the token", () => {
    expect(extractProject("^NSW ring Bastien", PROJECTS)).toEqual({
      title: "ring Bastien",
      projectId: "nsw",
      projectOnly: false,
    });
  });

  it("prefers the longest matching project name", () => {
    expect(extractProject("draft brief ^Housing Policy", PROJECTS)).toEqual({
      title: "draft brief",
      projectId: "housing-policy",
      projectOnly: false,
    });
  });

  it("still matches the shorter name when the longer one does not apply", () => {
    expect(extractProject("^Housing repairs list", PROJECTS)).toEqual({
      title: "repairs list",
      projectId: "housing",
      projectOnly: false,
    });
  });

  it("matches case-insensitively", () => {
    expect(extractProject("ring Lisa ^nsw", PROJECTS)).toEqual({
      title: "ring Lisa",
      projectId: "nsw",
      projectOnly: false,
    });
  });

  it("leaves an unknown token in the title and falls back to Inbox", () => {
    expect(extractProject("^Housng draft brief", PROJECTS)).toEqual({
      title: "^Housng draft brief",
      projectId: null,
      projectOnly: false,
    });
  });

  it("skips a non-matching sigil and resolves a later one", () => {
    expect(extractProject("2 ^ 3 is ^NSW maths", PROJECTS)).toEqual({
      title: "2 ^ 3 is maths",
      projectId: "nsw",
      projectOnly: false,
    });
  });

  it("collapses the whitespace left behind by a mid-title token", () => {
    expect(extractProject("ring ^NSW Bastien", PROJECTS)).toEqual({
      title: "ring Bastien",
      projectId: "nsw",
      projectOnly: false,
    });
  });

  it("flags a title that is only a project token", () => {
    expect(extractProject("^NSW", PROJECTS)).toEqual({
      title: "^NSW",
      projectId: "nsw",
      projectOnly: true,
    });
  });

  it("returns the raw title when there is no sigil", () => {
    expect(extractProject("  ring Bastien  ", PROJECTS)).toEqual({
      title: "ring Bastien",
      projectId: null,
      projectOnly: false,
    });
  });
});

describe("activeProjectToken", () => {
  it("returns the token the caret sits in", () => {
    expect(activeProjectToken("ring ^ns", 8)).toEqual({
      start: 5,
      end: 8,
      query: "ns",
    });
  });

  it("returns an empty query for a bare sigil", () => {
    expect(activeProjectToken("^", 1)).toEqual({ start: 0, end: 1, query: "" });
  });

  it("keeps spaces inside the query so multi-word names can match", () => {
    expect(activeProjectToken("^Housing Pol", 12)?.query).toBe("Housing Pol");
  });

  it("uses the nearest sigil before the caret", () => {
    expect(activeProjectToken("^NSW and ^ho", 12)?.start).toBe(9);
  });

  it("returns null when there is no sigil before the caret", () => {
    expect(activeProjectToken("ring Bastien", 12)).toBeNull();
    expect(activeProjectToken("ring ^ns", 4)).toBeNull();
    expect(activeProjectToken("^ns", 0)).toBeNull();
  });
});
