CREATE TYPE "public"."activity_kind" AS ENUM('sign_in', 'page_view', 'click');--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activity_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"member_id" integer NOT NULL,
	"kind" "activity_kind" NOT NULL,
	"label" text NOT NULL,
	"path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_events_created_at_index" ON "activity_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_events_member_id_created_at_index" ON "activity_events" USING btree ("member_id","created_at");