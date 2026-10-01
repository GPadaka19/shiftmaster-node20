CREATE TYPE "public"."area_kind" AS ENUM('floor', 'studio', 'building');--> statement-breakpoint
CREATE TYPE "public"."building" AS ENUM('G2', 'G7');--> statement-breakpoint
CREATE TYPE "public"."member_pool" AS ENUM('lab', 'studio', 'pkl');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('superadmin', 'admin', 'staff');--> statement-breakpoint
CREATE TYPE "public"."mode" AS ENUM('lecture', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."room_kind" AS ENUM('lab', 'studio', 'virtual');--> statement-breakpoint
CREATE TYPE "public"."roster_source" AS ENUM('generated', 'manual');--> statement-breakpoint
CREATE TYPE "public"."roster_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."sheet_source" AS ENUM('timetable', 'agenda');--> statement-breakpoint
CREATE TABLE "areas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "areas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	"building" "building" NOT NULL,
	"kind" "area_kind" NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "areas_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"roster_week_id" integer NOT NULL,
	"date" date NOT NULL,
	"area_id" integer NOT NULL,
	"shift_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"position" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "assignments_week_date_member_unique" UNIQUE("roster_week_id","date","member_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"actor_id" integer,
	"action" text NOT NULL,
	"subject" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"date" date PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "member_g2_locks" (
	"member_id" integer NOT NULL,
	"weekday" smallint NOT NULL,
	CONSTRAINT "member_g2_locks_member_id_weekday_pk" PRIMARY KEY("member_id","weekday"),
	CONSTRAINT "member_g2_locks_weekday" CHECK ("member_g2_locks"."weekday" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "member_patterns" (
	"member_id" integer NOT NULL,
	"weekday" smallint NOT NULL,
	"shift_id" integer NOT NULL,
	"area_id" integer,
	CONSTRAINT "member_patterns_member_id_weekday_pk" PRIMARY KEY("member_id","weekday"),
	CONSTRAINT "member_patterns_weekday" CHECK ("member_patterns"."weekday" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nickname" text NOT NULL,
	"nickname_normalized" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"role" "member_role" DEFAULT 'staff' NOT NULL,
	"pool" "member_pool",
	"duty_label" text,
	"max_g2_per_week" smallint,
	"pin_hash" text,
	"failed_pin_attempts" smallint DEFAULT 0 NOT NULL,
	"pin_locked_until" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_nickname_normalized_unique" UNIQUE("nickname_normalized"),
	CONSTRAINT "members_email_unique" UNIQUE("email"),
	CONSTRAINT "members_admin_has_email" CHECK ("members"."role" = 'staff' OR "members"."email" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "periods" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "periods_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"mode" "mode" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "periods_range" CHECK ("periods"."end_date" >= "periods"."start_date")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"code" text PRIMARY KEY NOT NULL,
	"building" "building",
	"floor" smallint,
	"kind" "room_kind" NOT NULL,
	"area_id" integer,
	"visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roster_weeks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "roster_weeks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"week_start" date NOT NULL,
	"mode" "mode" NOT NULL,
	"status" "roster_status" DEFAULT 'draft' NOT NULL,
	"source" "roster_source" NOT NULL,
	"created_by" integer,
	"published_at" timestamp with time zone,
	"published_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roster_weeks_week_start_unique" UNIQUE("week_start"),
	CONSTRAINT "roster_weeks_monday" CHECK (EXTRACT(ISODOW FROM "roster_weeks"."week_start") = 1)
);
--> statement-breakpoint
CREATE TABLE "seat_templates" (
	"area_id" integer NOT NULL,
	"shift_id" integer NOT NULL,
	"capacity" smallint NOT NULL,
	CONSTRAINT "seat_templates_area_id_shift_id_pk" PRIMARY KEY("area_id","shift_id"),
	CONSTRAINT "seat_templates_capacity" CHECK ("seat_templates"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sheet_snapshots" (
	"source" "sheet_source" PRIMARY KEY NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"payload" jsonb NOT NULL,
	"last_error" text,
	"last_error_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shifts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"mode" "mode" NOT NULL,
	"label" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "shifts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_roster_week_id_roster_weeks_id_fk" FOREIGN KEY ("roster_week_id") REFERENCES "public"."roster_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_members_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_g2_locks" ADD CONSTRAINT "member_g2_locks_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_patterns" ADD CONSTRAINT "member_patterns_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_patterns" ADD CONSTRAINT "member_patterns_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_patterns" ADD CONSTRAINT "member_patterns_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_weeks" ADD CONSTRAINT "roster_weeks_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_weeks" ADD CONSTRAINT "roster_weeks_published_by_members_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_templates" ADD CONSTRAINT "seat_templates_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_templates" ADD CONSTRAINT "seat_templates_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignments_date_index" ON "assignments" USING btree ("date");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_index" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "periods_start_date_index" ON "periods" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "sessions_member_id_index" ON "sessions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_index" ON "sessions" USING btree ("expires_at");