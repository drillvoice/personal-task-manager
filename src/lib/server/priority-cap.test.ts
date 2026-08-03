import { describe, expect, it } from "vitest";
import { PRIORITY_TASK_CAP, WEEKLY_PRIORITY_CAP } from "@/lib/caps";
import { decideSlot } from "./priority-cap";

/**
 * `decideSlot` is the whole cap decision — `claimDailyPlanSlot` and
 * `claimWeeklyPrioritySlot` only count the rows and hand the result here — so
 * testing it needs no database and no mock of one.
 *
 * An earlier version of this file mocked Drizzle to test a pair of helpers
 * nothing in the app ever called, which meant the cap that actually shipped was
 * uncovered.
 */
describe("decideSlot", () => {
  it("grants a slot below the cap", () => {
    for (const n of [0, 1, 2]) {
      expect(decideSlot("daily", PRIORITY_TASK_CAP, {
        count: n,
        maxSortOrder: n - 1,
      })).toEqual({ ok: true, sortOrder: n });
    }
  });

  it("starts at 0 when nothing is filed yet", () => {
    expect(
      decideSlot("daily", PRIORITY_TASK_CAP, { count: 0, maxSortOrder: null }),
    ).toEqual({ ok: true, sortOrder: 0 });
  });

  it("refuses at the cap", () => {
    const claim = decideSlot("daily", PRIORITY_TASK_CAP, {
      count: PRIORITY_TASK_CAP,
      maxSortOrder: 2,
    });
    expect(claim.ok).toBe(false);
    expect(claim.ok === false && claim.error).toMatch(/already has 3 tasks/);
  });

  it("refuses above the cap", () => {
    expect(
      decideSlot("daily", PRIORITY_TASK_CAP, { count: 5, maxSortOrder: 4 }),
    ).toMatchObject({ ok: false });
  });

  // sort_order is read back to order the three Today slots and the review's
  // top-3, so a removed row leaves a gap the next claim must step past rather
  // than reuse — a count-derived value would collide with a live slot.
  it("steps past a gap left by a removed slot", () => {
    expect(
      decideSlot("daily", PRIORITY_TASK_CAP, { count: 1, maxSortOrder: 7 }),
    ).toEqual({ ok: true, sortOrder: 8 });
  });

  it("names the weekly review in its own cap message", () => {
    const claim = decideSlot("weekly", WEEKLY_PRIORITY_CAP, {
      count: WEEKLY_PRIORITY_CAP,
      maxSortOrder: 2,
    });
    expect(claim.ok === false && claim.error).toMatch(
      /already has 3 priorities/,
    );
  });
});
