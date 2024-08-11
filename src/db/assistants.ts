import { sql } from "drizzle-orm";
import { db } from "./connection";
import { assistant, tools, assistantTools } from "./schema";
import { createInsertSchema } from "drizzle-typebox";
import { Static, t } from "elysia";

export const createAssistantSchema = createInsertSchema(assistant, {
  name: t.String({ minLength: 3, maxLength: 10 }),
  prompt: t.String({ minLength: 10 }),
});

export const updateAssistantSchema = t.Object({
  name: t.String({ minLength: 3, maxLength: 10 }),
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

export async function getAssistant(id: number) {
  const result = await db
    .select({
      assistantId: assistant.id,
      assistantName: assistant.name,
      prompt: assistant.prompt,
      model: assistant.model,
      enabled: assistant.enabled,
      tools: sql`json_agg(json_build_object('id', ${tools.id}, 'name', ${tools.name}, 'description', ${tools.description}))`.as('tools'),
    })
    .from(assistant)
    .leftJoin(assistantTools, sql`${assistant.id} = ${assistantTools.assistantId}`)
    .leftJoin(tools, sql`${assistantTools.toolId} = ${tools.id}`)
    .where(sql`${assistant.id} = ${id}`)
    .groupBy(assistant.id);

  return result[0];
}

export async function getAssistantByName(name: string) {
  const result = await db
    .select({
      assistantId: assistant.id,
      assistantName: assistant.name,
      prompt: assistant.prompt,
      model: assistant.model,
      enabled: assistant.enabled,
      tools: sql`json_agg(json_build_object('id', ${tools.id}, 'name', ${tools.name}, 'description', ${tools.description}))`.as('tools'),
    })
    .from(assistant)
    .leftJoin(assistantTools, sql`${assistant.id} = ${assistantTools.assistantId}`)
    .leftJoin(tools, sql`${assistantTools.toolId} = ${tools.id}`)
    .where(sql`${assistant.name} = ${name}`)
    .groupBy(assistant.id);

  return result[0];
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
