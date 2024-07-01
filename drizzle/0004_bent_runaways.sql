ALTER TABLE "messages" ALTER COLUMN "content" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "role" text NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "tool_call_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "tool_calls" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "name" text;