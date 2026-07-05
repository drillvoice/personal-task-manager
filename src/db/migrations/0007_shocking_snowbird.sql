CREATE UNIQUE INDEX "dpi_plan_slot_uniq" ON "daily_plan_items" USING btree ("daily_plan_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "wp_review_slot_uniq" ON "weekly_priorities" USING btree ("weekly_review_id","sort_order");--> statement-breakpoint
ALTER TABLE "daily_plan_items" ADD CONSTRAINT "dpi_slot_range" CHECK ("daily_plan_items"."sort_order" >= 0 and "daily_plan_items"."sort_order" < 3);--> statement-breakpoint
ALTER TABLE "weekly_priorities" ADD CONSTRAINT "wp_slot_range" CHECK ("weekly_priorities"."sort_order" >= 0 and "weekly_priorities"."sort_order" < 3);