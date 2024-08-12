import { InferSelectModel } from "drizzle-orm";
import { assistant, tools } from "./schema";

// Infer the Tool type from the tools schema
export type Tool = InferSelectModel<typeof tools>;

// Infer the Assistant type from the assistant schema
export type AssistantWithTools = InferSelectModel<typeof assistant> & {
  tools: Tool[]; // Add the tools array to the Assistant type
};
