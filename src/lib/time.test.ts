import { describe, expect, it } from "vitest";
import {
  dueLabel,
  isOverdue,
  isToday,
  recentWeekStarts,
  todayIso,
  weekStartIso,
} from "./time";

// All fixtures anchor to Sydney (UTC+10, no DST in July).
// 2026-07-01 (Wed) is week-start Monday 2026-06-29.
const wed = new Date("2026-07-01T06:00:00Z"); // 4pm Sydney

describe("weekStartIso", () => {
  it("buckets a Wednesday into the preceding Monday", () => {
    expect(weekStartIso(wed)).toBe("2026-06-29");
  });

  it("keeps a Monday morning in the same week", () => {
    const monMorning = new Date("2026-06-29T23:00:00Z"); // 9am Sydney Monday
    expect(weekStartIso(monMorning)).toBe("2026-06-29");
  });

  it("buckets Sunday-night-Sydney into the current week's Monday", () => {
    // 11pm Sunday Sydney = 1pm UTC Sunday
    const sunEve = new Date("2026-07-05T13:00:00Z");
    expect(weekStartIso(sunEve)).toBe("2026-06-29");
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
  it("returns a weekday name within the next 7 days", () => {
    expect(dueLabel("2026-07-05", wed)).toBe("Sun");
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
