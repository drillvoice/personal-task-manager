CREATE TYPE "public"."meeting_status" AS ENUM('upcoming', 'completed');--> statement-breakpoint
CREATE TABLE "meeting_attendees" (
	"meeting_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	CONSTRAINT "meeting_attendees_meeting_id_person_id_pk" PRIMARY KEY("meeting_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "meeting_tags" (
	"meeting_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "meeting_tags_meeting_id_tag_id_pk" PRIMARY KEY("meeting_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"status" "meeting_status" DEFAULT 'upcoming' NOT NULL,
	"meeting_date" date NOT NULL,
	"prep_notes" text DEFAULT '' NOT NULL,
	"meeting_notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "meeting_id" uuid;--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_tags" ADD CONSTRAINT "meeting_tags_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_tags" ADD CONSTRAINT "meeting_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meetings_user_status_date_idx" ON "meetings" USING btree ("user_id","status","meeting_date");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_meeting_idx" ON "tasks" USING btree ("meeting_id");