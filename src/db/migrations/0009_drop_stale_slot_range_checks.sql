-- wp_slot_range and dpi_slot_range checked 0 <= sort_order < 3, a leftover
-- from an earlier fixed-slot design (0000_even_shard.sql never created
-- them — like the indexes dropped in 0008, they were added by hand outside
-- of tracked migrations). sort_order is now just an insertion-order
-- tiebreaker that's never read back; the actual "at most 3" cap is enforced
-- in application code (assertWeeklyRoomForOne / assertDailyRoomForOne)
-- before every insert, so this constraint added no real safety — it just
-- rejected the strictly-increasing sort_order a removed-then-re-added row
-- produces.
ALTER TABLE "weekly_priorities" DROP CONSTRAINT IF EXISTS "wp_slot_range";
ALTER TABLE "daily_plan_items" DROP CONSTRAINT IF EXISTS "dpi_slot_range";
