ALTER TABLE "assistant_tools" ADD COLUMN "id" serial NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_assistant_tool" ON "assistant_tools" USING btree ("assistant_id","tool_id");