-- wp_review_slot_uniq and dpi_plan_slot_uniq enforced uniqueness on
-- (review/plan id, sort_order). Neither is declared in schema.ts or
-- created by a tracked migration — orphans from before migrations were
-- adopted. sort_order is write-only in both tables (nothing orders by
-- it), and the insert paths reused sort_order values after a row was
-- removed, so these stale constraints caused "duplicate key value
-- violates unique constraint" on a select/unselect sequence that
-- produced a repeat value.
DROP INDEX IF EXISTS "wp_review_slot_uniq";
DROP INDEX IF EXISTS "dpi_plan_slot_uniq";
