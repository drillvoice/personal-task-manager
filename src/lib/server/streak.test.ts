import { describe, expect, it } from "vitest";
import { computeStreak, lastCompletedReview, streakLabel } from "./streak";

// Anchor: current week starts Mon 2026-06-29.
const CURRENT = "2026-06-29";

const done = (iso: string): { weekStartDate: string; completedAt: Date } => ({
  weekStartDate: iso,
  completedAt: new Date(`${iso}T20:00:00Z`),
});

describe("computeStreak", () => {
  it("returns 0 when last week's review is missing", () => {
    const reviews = [done("2026-06-08"), done("2026-06-15")];
    expect(computeStreak(reviews, CURRENT)).toBe(0);
  });

  it("counts back one week when just last week completed", () => {
    expect(computeStreak([done("2026-06-22")], CURRENT)).toBe(1);
  });

  it("counts consecutive prior weeks", () => {
    const reviews = [
      done("2026-06-22"),
      done("2026-06-15"),
      done("2026-06-08"),
      done("2026-06-01"),
    ];
    expect(computeStreak(reviews, CURRENT)).toBe(4);
  });

  it("stops at the first gap", () => {
    const reviews = [
      done("2026-06-22"),
      done("2026-06-15"),
      // 2026-06-08 skipped
      done("2026-06-01"),
    ];
    expect(computeStreak(reviews, CURRENT)).toBe(2);
  });

  it("ignores unfinished reviews", () => {
    const reviews = [
      { weekStartDate: "2026-06-22", completedAt: null },
      done("2026-06-15"),
    ];
    expect(computeStreak(reviews, CURRENT)).toBe(0);
  });

  it("does not count the current week's review even if completed", () => {
    const reviews = [done(CURRENT), done("2026-06-22")];
    expect(computeStreak(reviews, CURRENT)).toBe(1);
  });
});

describe("lastCompletedReview", () => {
  it("returns the most recent completed review", () => {
    const r = lastCompletedReview([done("2026-06-08"), done("2026-06-22")]);
    expect(r?.weekStartDate).toBe("2026-06-22");
  });
  it("returns null when nothing is completed", () => {
    const r = lastCompletedReview([
      { weekStartDate: "2026-06-22", completedAt: null },
    ]);
    expect(r).toBeNull();
  });
});

describe("streakLabel", () => {
  const fmt = () => "Mon 22 Jun";
  it("says First review with no history", () => {
    expect(streakLabel(0, null, fmt)).toBe("First review");
  });
  it("includes the last-completed date when there is a streak", () => {
    expect(streakLabel(4, new Date(), fmt)).toBe(
      "4-week streak · last completed Mon 22 Jun",
    );
  });
});
