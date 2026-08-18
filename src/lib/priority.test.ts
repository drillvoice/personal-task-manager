import { describe, expect, it } from "vitest";
import {
  comparePriority,
  isPriorityTagName,
  priorityFromTagNames,
} from "@/lib/priority";
import type { Priority } from "@/lib/types";

describe("isPriorityTagName", () => {
  it("recognises p1/p2/p3 case-insensitively", () => {
    expect(isPriorityTagName("p1")).toBe(true);
    expect(isPriorityTagName("P2")).toBe(true);
    expect(isPriorityTagName("p3")).toBe(true);
  });

  it("rejects ordinary tag names", () => {
    expect(isPriorityTagName("urgent")).toBe(false);
    expect(isPriorityTagName("p4")).toBe(false);
    expect(isPriorityTagName("")).toBe(false);
  });

  // Object.prototype keys must not leak through the lookup.
  it("rejects inherited Object keys", () => {
    expect(isPriorityTagName("constructor")).toBe(false);
    expect(isPriorityTagName("Constructor")).toBe(false);
    expect(isPriorityTagName("toString")).toBe(false);
    expect(isPriorityTagName("hasOwnProperty")).toBe(false);
  });
});

describe("priorityFromTagNames", () => {
  it("returns null when no tag is a priority tag", () => {
    expect(priorityFromTagNames([])).toBeNull();
    expect(priorityFromTagNames(["ring", "waiting"])).toBeNull();
  });

  it("derives priority from a single tag, case-insensitively", () => {
    expect(priorityFromTagNames(["p1"])).toBe(1);
    expect(priorityFromTagNames(["P3"])).toBe(3);
  });

  it("takes the highest priority when several are present", () => {
    expect(priorityFromTagNames(["p3", "p1", "p2"])).toBe(1);
    expect(priorityFromTagNames(["p3", "p2"])).toBe(2);
  });

  it("ignores non-priority tags alongside a priority tag", () => {
    expect(priorityFromTagNames(["ring", "p2", "admin"])).toBe(2);
  });

  it("never returns a value inherited from Object.prototype", () => {
    expect(priorityFromTagNames(["constructor"])).toBeNull();
    expect(priorityFromTagNames(["constructor", "p2"])).toBe(2);
  });
});

describe("comparePriority", () => {
  it("sorts ascending by priority", () => {
    expect(comparePriority(1, 2)).toBeLessThan(0);
    expect(comparePriority(3, 1)).toBeGreaterThan(0);
    expect(comparePriority(2, 2)).toBe(0);
  });

  it("sorts untagged last", () => {
    expect(comparePriority(null, 3)).toBeGreaterThan(0);
    expect(comparePriority(3, null)).toBeLessThan(0);
    expect(comparePriority(null, null)).toBe(0);
  });

  it("orders a mixed list correctly", () => {
    const mixed: (Priority | null)[] = [null, 2, null, 1, 3];
    expect(mixed.sort(comparePriority)).toEqual([
      1,
      2,
      3,
      null,
      null,
    ]);
  });
});
