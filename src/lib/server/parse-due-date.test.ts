import { describe, expect, it } from "vitest";
import { extractDueDate } from "./parse-due-date";

// 2026-07-13 12:00 in Sydney (AEST, UTC+10 in July — no DST).
const NOW = new Date("2026-07-13T02:00:00Z");

describe("extractDueDate", () => {
  it("resolves 'in N days' relative to today and strips the phrase", () => {
    expect(extractDueDate("Reply to John's email in 14 days", NOW)).toEqual({
      title: "Reply to John's email",
      dueDate: "2026-07-27",
    });
  });

  it("handles 'tomorrow'", () => {
    expect(extractDueDate("Submit report tomorrow", NOW)).toEqual({
      title: "Submit report",
      dueDate: "2026-07-14",
    });
  });

  it("handles 'today'", () => {
    expect(extractDueDate("Pay rent today", NOW)).toEqual({
      title: "Pay rent",
      dueDate: "2026-07-13",
    });
  });

  it("resolves a bare weekday forward, not backward", () => {
    // 2026-07-13 is a Monday; forwardDate pushes "friday" to the coming 17th
    // rather than the Friday just past.
    expect(extractDueDate("Call the plumber friday", NOW)).toEqual({
      title: "Call the plumber",
      dueDate: "2026-07-17",
    });
  });

  it("leaves a title with no date phrase untouched", () => {
    expect(extractDueDate("Update the paper with trend data", NOW)).toEqual({
      title: "Update the paper with trend data",
      dueDate: null,
    });
  });

  it("does not hijack a title that is only a date phrase", () => {
    expect(extractDueDate("tomorrow", NOW)).toEqual({
      title: "tomorrow",
      dueDate: null,
    });
  });
});
