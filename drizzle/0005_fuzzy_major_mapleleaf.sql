ALTER TABLE "tools" ADD COLUMN "endpoint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tools" ADD COLUMN "method" text DEFAULT 'POST' NOT NULL;