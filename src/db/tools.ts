import { sql } from "drizzle-orm";
import { db } from "./connection";
import { tools } from "./schema";
import { createInsertSchema } from "drizzle-typebox";
import { Static, t } from "elysia";

// Custom validation for tool name
const toolNameSchema = t.String({
  pattern: "^[a-z_]+$",
  errorMessage:
    "Name must be lowercase, contain no spaces, and be separated by underscores.",
});

const jsonSchemaValidator = t.Object({
  type: t.String(),
  properties: t.Record(
    t.String(),
    t.Object({
      type: t.String(),
      description: t.Optional(t.String()),
      default: t.Optional(t.Any()),
    }),
  ),
  required: t.Optional(t.Array(t.String())),
});

export const createToolSchema = createInsertSchema(tools, {
  name: toolNameSchema,
  description: t.String({ minLength: 10 }),
  type: t.String({ minLength: 3, maxLength: 50 }),
  parameters: jsonSchemaValidator,
  endpoint: t.String(),
  method: t.String(),
});

export const updateToolSchema = t.Object({
  name: toolNameSchema,
  description: t.Optional(t.String({ minLength: 10 })),
  type: t.Optional(t.String({ minLength: 3, maxLength: 50 })),
  parameters: t.Optional(jsonSchemaValidator),
  endpoint: t.Optional(t.String()),
  method: t.Optional(t.String()),
});

// Function to create a new tool
export function createTool(tool: Static<typeof createToolSchema>) {
  return db.insert(tools).values(tool).returning().execute();
}

// Function to update an existing tool
export function updateTool(tool: Static<typeof updateToolSchema>) {
  return db
    .update(tools)
    .set(tool)
    .where(sql`${tools.name} = ${tool.name}`);
}

// Function to get a tool by its ID
export function getTool(id: number) {
  return db
    .select()
    .from(tools)
    .where(sql`${tools.id} = ${id}`);
}

// Function to get a tool by its name
export function getToolByName(name: string) {
  return db
    .select()
    .from(tools)
    .where(sql`${tools.name} = ${name}`);
}

// Function to get all tools
export function getAllTools() {
  return db.select().from(tools).execute();
}

// Function to delete a tool by its name
export function deleteTool(name: string) {
  return db.delete(tools).where(sql`${tools.name} = ${name}`);
}
