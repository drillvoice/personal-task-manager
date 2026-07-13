import { describe, expect, it } from "vitest";
import {
  dueLabel,
  isOverdue,
  isToday,
  recentWeekStarts,
  todayIso,
  weekBeginningLabel,
  weekStartIso,
} from "./time";

// All fixtures anchor to Sydney (UTC+10, no DST in July).
// Weeks run Sunday→Saturday, keyed by the Monday inside that span.
// 2026-07-01 (Wed) sits in the Sun 28 Jun–Sat 4 Jul week → Monday 2026-06-29.
const wed = new Date("2026-07-01T06:00:00Z"); // 4pm Sydney

describe("weekStartIso", () => {
  it("buckets a Wednesday into its week's Monday", () => {
    expect(weekStartIso(wed)).toBe("2026-06-29");
  });

  it("keeps a Monday morning in the same week", () => {
    const monMorning = new Date("2026-06-29T23:00:00Z"); // 9am Sydney Monday
    expect(weekStartIso(monMorning)).toBe("2026-06-29");
  });

  it("buckets a Sunday into the upcoming Monday's week", () => {
    // 11pm Sunday 5 Jul Sydney = 1pm UTC Sunday. Sunday starts the
    // Sun 5–Sat 11 week → keyed by Monday 6 Jul, not the week just ending.
    const sunEve = new Date("2026-07-05T13:00:00Z");
    expect(weekStartIso(sunEve)).toBe("2026-07-06");
  });

  it("keeps a Saturday in the same week as the preceding Sunday", () => {
    const sat = new Date("2026-07-11T02:00:00Z"); // noon Sydney Saturday 11 Jul
    expect(weekStartIso(sat)).toBe("2026-07-06");
  });
});

describe("weekBeginningLabel", () => {
  it('formats as "w/b Mon d MMM"', () => {
    expect(weekBeginningLabel("2026-07-13")).toBe("w/b Mon 13 Jul");
  });
});

describe("recentWeekStarts", () => {
  it("returns N Mondays ending on the current week's Monday", () => {
    const weeks = recentWeekStarts(4, wed);
    expect(weeks).toEqual([
      "2026-06-08",
      "2026-06-15",
      "2026-06-22",
      "2026-06-29",
    ]);
  });
});

describe("todayIso", () => {
  it("uses Sydney date, not UTC", () => {
    // 11pm UTC on 30 Jun = 9am Sydney on 1 Jul
    expect(todayIso(new Date("2026-06-30T23:00:00Z"))).toBe("2026-07-01");
  });
});

describe("dueLabel", () => {
  it('returns "Today" for today\'s date', () => {
    expect(dueLabel("2026-07-01", wed)).toBe("Today");
  });
  it('returns "Tomorrow" for tomorrow', () => {
    expect(dueLabel("2026-07-02", wed)).toBe("Tomorrow");
  });
  it("returns a weekday name within the next 6 days", () => {
    expect(dueLabel("2026-07-05", wed)).toBe("Sun");
  });
  it("returns a day-month label for exactly a week out (same weekday as today)", () => {
    expect(dueLabel("2026-07-08", wed)).toBe("8 Jul");
  });
  it("returns a day-month label further out", () => {
    expect(dueLabel("2026-07-20", wed)).toBe("20 Jul");
  });
});

describe("isToday / isOverdue", () => {
  it("recognises today", () => {
    expect(isToday("2026-07-01", wed)).toBe(true);
  });
  it("flags yesterday as overdue", () => {
    expect(isOverdue("2026-06-30", wed)).toBe(true);
  });
  it("does not flag today as overdue", () => {
    expect(isOverdue("2026-07-01", wed)).toBe(false);
  });
});
