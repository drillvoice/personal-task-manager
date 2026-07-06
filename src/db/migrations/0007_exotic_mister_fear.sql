DROP INDEX "tasks_user_due_priority_idx";--> statement-breakpoint
CREATE INDEX "tasks_user_due_idx" ON "tasks" USING btree ("user_id","due_date");--> statement-breakpoint
INSERT INTO "tags" ("user_id", "name", "kind") SELECT DISTINCT "user_id", 'p' || "priority", 'task'::"tag_kind" FROM "tasks" ON CONFLICT ("user_id","kind","name") DO NOTHING;--> statement-breakpoint
INSERT INTO "task_tags" ("task_id", "tag_id") SELECT t."id", tg."id" FROM "tasks" t JOIN "tags" tg ON tg."user_id" = t."user_id" AND tg."kind" = 'task'::"tag_kind" AND tg."name" = 'p' || t."priority" ON CONFLICT ("task_id","tag_id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "priority";