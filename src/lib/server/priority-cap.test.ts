import { describe, expect, it, vi } from "vitest";
import {
  PriorityCapExceededError,
  assertDailyRoomForOne,
  assertWeeklyRoomForOne,
} from "./priority-cap";

/**
 * Unit test the cap logic without touching a real database. Drizzle chain calls
 * are stubbed to return arrays of arbitrary length so we can assert the
 * decision boundary at 3.
 */
vi.mock("@/lib/db", () => {
  const rows: unknown[] = [];
  const chain = {
    from: () => chain,
    where: () => [{ value: rows.length }],
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
const rows = (mocked.db as unknown as { __rows: unknown[] }).__rows;

const setCount = (n: number) => {
  rows.length = 0;
  for (let i = 0; i < n; i++) rows.push({ id: String(i) });
};

describe("assertDailyRoomForOne", () => {
  it("accepts 0, 1, and 2 existing items", async () => {
    for (const n of [0, 1, 2]) {
      setCount(n);
      await expect(assertDailyRoomForOne("plan-1")).resolves.toBeUndefined();
    }
  });
  it("rejects at 3", async () => {
    setCount(3);
    await expect(assertDailyRoomForOne("plan-1")).rejects.toBeInstanceOf(
      PriorityCapExceededError,
    );
  });
  it("rejects above 3", async () => {
    setCount(5);
    await expect(assertDailyRoomForOne("plan-1")).rejects.toBeInstanceOf(
      PriorityCapExceededError,
    );
  });
});

describe("assertWeeklyRoomForOne", () => {
  it("accepts fewer than 3", async () => {
    setCount(2);
    await expect(
      assertWeeklyRoomForOne("review-1"),
    ).resolves.toBeUndefined();
  });
  it("rejects at 3", async () => {
    setCount(3);
    await expect(
      assertWeeklyRoomForOne("review-1"),
    ).rejects.toBeInstanceOf(PriorityCapExceededError);
  });
});
