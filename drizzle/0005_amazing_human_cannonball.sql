ALTER TABLE "messages" ALTER COLUMN "tool_calls" SET DATA TYPE json USING "tool_calls"::json;
