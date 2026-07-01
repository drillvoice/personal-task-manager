CREATE INDEX "projects_user_name_idx" ON "projects" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "tasks_user_due_priority_idx" ON "tasks" USING btree ("user_id","due_date","priority");--> statement-breakpoint
CREATE INDEX "tasks_user_sort_created_idx" ON "tasks" USING btree ("user_id","sort_order","created_at");