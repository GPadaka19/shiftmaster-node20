CREATE TYPE "public"."swap_status" AS ENUM('awaiting_target', 'awaiting_admin', 'approved', 'rejected', 'declined', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "swap_requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "swap_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"roster_week_id" integer NOT NULL,
	"date" date NOT NULL,
	"requester_id" integer NOT NULL,
	"requester_assignment_id" integer,
	"requester_area_id" integer NOT NULL,
	"requester_shift_id" integer NOT NULL,
	"target_id" integer NOT NULL,
	"target_assignment_id" integer,
	"target_area_id" integer NOT NULL,
	"target_shift_id" integer NOT NULL,
	"reason" text,
	"status" "swap_status" DEFAULT 'awaiting_target' NOT NULL,
	"target_responded_at" timestamp with time zone,
	"decided_by" integer,
	"decided_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_roster_week_id_roster_weeks_id_fk" FOREIGN KEY ("roster_week_id") REFERENCES "public"."roster_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_requester_id_members_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_requester_assignment_id_assignments_id_fk" FOREIGN KEY ("requester_assignment_id") REFERENCES "public"."assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_requester_area_id_areas_id_fk" FOREIGN KEY ("requester_area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_requester_shift_id_shifts_id_fk" FOREIGN KEY ("requester_shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_target_id_members_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_target_assignment_id_assignments_id_fk" FOREIGN KEY ("target_assignment_id") REFERENCES "public"."assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_target_area_id_areas_id_fk" FOREIGN KEY ("target_area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_target_shift_id_shifts_id_fk" FOREIGN KEY ("target_shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_decided_by_members_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "swap_requests_status_index" ON "swap_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "swap_requests_requester_id_index" ON "swap_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "swap_requests_target_id_index" ON "swap_requests" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "swap_requests_date_index" ON "swap_requests" USING btree ("date");