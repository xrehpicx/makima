import { sql } from "drizzle-orm";
import { db } from "./connection";
import { assistant, tools, assistantTools } from "./schema";
import { createInsertSchema } from "drizzle-typebox";
import { Static, t } from "elysia";
import { AssistantWithTools } from "./types";

export const createAssistantSchema = createInsertSchema(assistant, {
  name: t.String({ minLength: 3, maxLength: 20 }),
  prompt: t.String({ minLength: 10 }),
});

export const updateAssistantSchema = t.Object({
  name: t.String({ minLength: 3, maxLength: 20 }),
  prompt: t.Optional(t.String()),
  model: t.Optional(t.String()),
  enabled: t.Optional(t.Boolean()),
});

export function createAssistant(ass: Static<typeof createAssistantSchema>) {
  return db.insert(assistant).values(ass).returning().execute();
}

export function updateAssistant(ass: Static<typeof updateAssistantSchema>) {
  return db
    .update(assistant)
    .set(ass)
    .where(sql`${assistant.name} = ${ass.name}`);
}

export async function getAssistant(
  identifier: number | string,
): Promise<AssistantWithTools> {
  const whereCondition =
    typeof identifier === "number"
      ? sql`${assistant.id} = ${identifier}`
      : sql`${assistant.name} = ${identifier}`;

  const result = await db
    .select({
      id: assistant.id,
      name: assistant.name,
      prompt: assistant.prompt,
      model: assistant.model,
      enabled: assistant.enabled,
      tools: sql`json_agg(
        json_build_object(
          'id', ${tools.id},
          'name', ${tools.name},
          'description', ${tools.description},
          'type', ${tools.type},
          'parameters', ${tools.parameters},
          'endpoint', ${tools.endpoint},
          'method', ${tools.method},
          'createdAt', ${tools.createdAt},
          'updatedAt', ${tools.updatedAt}
        )
      )`.as("tools"),
    })
    .from(assistant)
    .leftJoin(
      assistantTools,
      sql`${assistant.id} = ${assistantTools.assistantId}`,
    )
    .leftJoin(tools, sql`${assistantTools.toolId} = ${tools.id}`)
    .where(whereCondition)
    .groupBy(assistant.id)
    .execute();

  if (result.length === 0) {
    throw new Error("Assistant not found");
  }

  return result[0] as AssistantWithTools;
}

export async function addToolToAssistant(
  assistantName: string,
  toolName: string,
) {
  // Get the assistant ID by name
  const assistantResult = await db
    .select({ id: assistant.id })
    .from(assistant)
    .where(sql`${assistant.name} = ${assistantName}`)
    .execute();

  if (assistantResult.length === 0) {
    throw new Error(`Assistant with name "${assistantName}" not found.`);
  }

  const assistantId = assistantResult[0].id;

  // Get the tool ID by name
  const toolResult = await db
    .select({ id: tools.id })
    .from(tools)
    .where(sql`${tools.name} = ${toolName}`)
    .execute();

  if (toolResult.length === 0) {
    throw new Error(`Tool with name "${toolName}" not found.`);
  }

  const toolId = toolResult[0].id;

  // Insert the relationship into the assistantTools junction table
  return db
    .insert(assistantTools)
    .values({
      assistantId: assistantId,
      toolId: toolId,
    })
    .execute();
}

export async function removeToolFromAssistant(
  assistantName: string,
  toolName: string,
) {
  // Get the assistant ID by name
  const assistantResult = await db
    .select({ id: assistant.id })
    .from(assistant)
    .where(sql`${assistant.name} = ${assistantName}`)
    .execute();

  if (assistantResult.length === 0) {
    throw new Error(`Assistant with name "${assistantName}" not found.`);
  }

  const assistantId = assistantResult[0].id;

  // Get the tool ID by name
  const toolResult = await db
    .select({ id: tools.id })
    .from(tools)
    .where(sql`${tools.name} = ${toolName}`)
    .execute();

  if (toolResult.length === 0) {
    throw new Error(`Tool with name "${toolName}" not found.`);
  }

  const toolId = toolResult[0].id;

  // Delete the relationship from the assistantTools table
  const deleteResult = await db
    .delete(assistantTools)
    .where(
      sql`${assistantTools.assistantId} = ${assistantId} and ${assistantTools.toolId} = ${toolId}`,
    )
    .execute();

  if (deleteResult.rowCount === 0) {
    throw new Error(
      `Tool "${toolName}" is not associated with assistant "${assistantName}".`,
    );
  }

  return {
    message: `Tool "${toolName}" removed from assistant "${assistantName}".`,
  };
}

export async function getAssistantID(name: string) {
  const res = await db
    .select({ id: assistant.id })
    .from(assistant)
    .where(sql`${assistant.name} = ${name}`)
    .execute();

  if (res.length === 0) {
    throw new Error("Assistant not found");
  }

  return res[0].id;
}

export function getAllAssistants() {
  return db.select().from(assistant).execute();
}

export async function checkAssistant(identifier: string | number) {
  let query;
  if (typeof identifier === "string") {
    query = sql`${assistant.name} = ${identifier} AND ${assistant.enabled} = true`;
  } else if (typeof identifier === "number") {
    query = sql`${assistant.id} = ${identifier} AND ${assistant.enabled} = true`;
  } else {
    throw new Error("Invalid identifier type");
  }

  const res = await db
    .select({ count: sql`COUNT(*)` })
    .from(assistant)
    .where(query)
    .execute();

  return (res[0].count as number) > 0;
}

export function disableAssistant(name: string) {
  return db
    .update(assistant)
    .set({ enabled: false })
    .where(sql`${assistant.name} = ${name}`);
}

export function enableAssistant(name: string) {
  return db
    .update(assistant)
    .set({ enabled: true })
    .where(sql`${assistant.name} = ${name}`);
}

export function deleteAssistant(name: string) {
  return db.delete(assistant).where(sql`${assistant.name} = ${name}`);
}
