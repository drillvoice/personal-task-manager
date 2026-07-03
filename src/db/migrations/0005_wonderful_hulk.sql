CREATE TABLE "task_assignees" (
	"task_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	CONSTRAINT "task_assignees_task_id_person_id_pk" PRIMARY KEY("task_id","person_id")
);
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_person_id_people_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_organisation_id_organisations_id_fk";
--> statement-breakpoint
DROP INDEX "tasks_person_idx";--> statement-breakpoint
DROP INDEX "tasks_organisation_idx";--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "task_assignees" ("task_id", "person_id") SELECT "id", "person_id" FROM "tasks" WHERE "person_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "person_id";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "organisation_id";