DROP INDEX "wr_user_week_uniq";--> statement-breakpoint
CREATE UNIQUE INDEX "wr_user_open_uniq" ON "weekly_reviews" USING btree ("user_id") WHERE "weekly_reviews"."completed_at" is null;