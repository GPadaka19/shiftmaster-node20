-- Shift codes are keys used in code; their labels (Pagi, Siang, Harian) stay as shown to users.
UPDATE "shifts" SET "code" = 'morning' WHERE "code" = 'pagi';--> statement-breakpoint
UPDATE "shifts" SET "code" = 'afternoon' WHERE "code" = 'siang';--> statement-breakpoint
UPDATE "shifts" SET "code" = 'daily' WHERE "code" = 'harian';
