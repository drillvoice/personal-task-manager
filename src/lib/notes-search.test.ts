import { describe, expect, it } from "vitest";
import { escapeLikePattern, noteHeadline } from "./notes-search";

describe("escapeLikePattern", () => {
  it("leaves ordinary search text alone", () => {
    expect(escapeLikePattern("polling company")).toBe("polling company");
    expect(escapeLikePattern("#logistics")).toBe("#logistics");
  });

  it("escapes the ILIKE wildcards so they match literally", () => {
    expect(escapeLikePattern("50%")).toBe("50\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
  });

  it("escapes backslashes without double-escaping the ones it adds", () => {
    expect(escapeLikePattern("\\")).toBe("\\\\");
    expect(escapeLikePattern("c:\\100%")).toBe("c:\\\\100\\%");
  });
});

describe("noteHeadline", () => {
  it("takes the first non-empty line, trimmed", () => {
    expect(noteHeadline("Pyxis is a polling company\n\nCheap in NSW")).toBe(
      "Pyxis is a polling company",
    );
    expect(noteHeadline("\n\n  Momentum Logistics  \nsecond")).toBe(
      "Momentum Logistics",
    );
  });

  it("returns an empty string for a blank body", () => {
    expect(noteHeadline("")).toBe("");
    expect(noteHeadline("\n  \n")).toBe("");
  });
});
