CREATE TYPE "public"."tag_kind" AS ENUM('task', 'meeting');--> statement-breakpoint
DROP INDEX "tags_user_name_uniq";--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "kind" "tag_kind" DEFAULT 'task' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_kind_name_uniq" ON "tags" USING btree ("user_id","kind","name");