import { describe, expect, it, vi } from "vitest";
import {
  PriorityCapExceededError,
  reserveDailySlot,
  reserveWeeklySlot,
} from "./priority-cap";

/**
 * Unit test the slot-allocation logic without touching a real database. The
 * Drizzle chain is stubbed to return the sort_order rows currently occupying a
 * plan/review so we can assert which free slot is handed out and where the cap
 * boundary rejects.
 */
vi.mock("@/lib/db", () => {
  const rows: { sortOrder: number }[] = [];
  const chain = {
    from: () => chain,
    where: () => rows,
  };
  return {
    db: {
      __rows: rows,
      select: () => chain,
      insert: vi.fn(),
    },
  };
});

const mocked = await import("@/lib/db");
const rows = (mocked.db as unknown as { __rows: { sortOrder: number }[] })
  .__rows;

const setSlots = (taken: number[]) => {
  rows.length = 0;
  for (const s of taken) rows.push({ sortOrder: s });
};

describe("reserveDailySlot", () => {
  it("hands out slot 0 when the plan is empty", async () => {
    setSlots([]);
    await expect(reserveDailySlot("plan-1")).resolves.toBe(0);
  });
  it("appends the next slot when filled in order", async () => {
    setSlots([0]);
    await expect(reserveDailySlot("plan-1")).resolves.toBe(1);
    setSlots([0, 1]);
    await expect(reserveDailySlot("plan-1")).resolves.toBe(2);
  });
  it("fills a freed middle gap rather than appending", async () => {
    setSlots([0, 2]);
    await expect(reserveDailySlot("plan-1")).resolves.toBe(1);
  });
  it("rejects when all three slots are taken", async () => {
    setSlots([0, 1, 2]);
    await expect(reserveDailySlot("plan-1")).rejects.toBeInstanceOf(
      PriorityCapExceededError,
    );
  });
});

describe("reserveWeeklySlot", () => {
  it("hands out the lowest free slot", async () => {
    setSlots([1]);
    await expect(reserveWeeklySlot("review-1")).resolves.toBe(0);
  });
  it("rejects when the review is full", async () => {
    setSlots([0, 1, 2]);
    await expect(reserveWeeklySlot("review-1")).rejects.toBeInstanceOf(
      PriorityCapExceededError,
    );
  });
});
