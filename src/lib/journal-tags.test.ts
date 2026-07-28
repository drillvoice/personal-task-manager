import { describe, expect, it } from "vitest";
import { findBareTagNames, isBareTagName, linkBareTags } from "./journal-tags";

describe("linkBareTags", () => {
  it("rewrites a bare tag into a tag: link", () => {
    expect(linkBareTags("spoke re #budget today")).toBe(
      "spoke re [#budget](tag:budget) today",
    );
  });

  it("leaves a fenced code block untouched", () => {
    const body = ["```c", "#include <stdio.h>", "```", "tagged #infra"].join(
      "\n",
    );
    expect(linkBareTags(body)).toBe(
      ["```c", "#include <stdio.h>", "```", "tagged [#infra](tag:infra)"].join(
        "\n",
      ),
    );
  });

  it("leaves an inline code span untouched", () => {
    expect(linkBareTags("use `#budget` here, tag #finance")).toBe(
      "use `#budget` here, tag [#finance](tag:finance)",
    );
  });

  it("leaves headings, issue refs and url fragments alone", () => {
    const body = "# Monday\nclosed #123 — see https://x.io/a#frag";
    expect(linkBareTags(body)).toBe(body);
  });

  it("does not touch the text of a structured tag link", () => {
    const body = "noted [#policy team](/tags/abc) today";
    expect(linkBareTags(body)).toBe(body);
  });

  it("rewrites exactly the tokens the save path stores", () => {
    const body = [
      "# Standup",
      "- pasted `#hack` and:",
      "```sh",
      "#!/bin/sh",
      "#define X",
      "```",
      "- follow up #budget and #NSW-north, closes #42",
    ].join("\n");
    const rendered = linkBareTags(body);
    const stored = findBareTagNames(body);
    expect(stored).toEqual(["budget", "NSW-north"]);
    for (const name of stored) {
      expect(rendered).toContain(`[#${name}](tag:${name})`);
    }
    expect(rendered).toContain("#define X");
    expect(rendered).toContain("closes #42");
  });
});

describe("isBareTagName", () => {
  it("accepts names that survive a round-trip", () => {
    expect(isBareTagName("budget")).toBe(true);
    expect(isBareTagName("NSW-north")).toBe(true);
    expect(isBareTagName("p1")).toBe(true);
  });

  it("rejects names a bare token could not represent", () => {
    expect(isBareTagName("budget!")).toBe(false);
    expect(isBareTagName("policy team")).toBe(false);
    expect(isBareTagName("123")).toBe(false);
    expect(isBareTagName("")).toBe(false);
  });
});
