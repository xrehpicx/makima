import { sql } from "drizzle-orm";
import { db } from "./connection";
import { assistant } from "./schema";
import { createInsertSchema } from "drizzle-typebox";
import { Static, t } from "elysia";

export const createAssistantSchema = createInsertSchema(assistant);
export const updateAssistantSchema = t.Intersect([
  t.Object({
    name: t.String(),
  }),
  t.Union([
    t.Object({
      model: t.String(),
      enabled: t.Optional(t.Boolean()),
    }),
    t.Object({
      model: t.Optional(t.String()),
      enabled: t.Boolean(),
    }),
  ]),
]);

export function createAssistant(ass: Static<typeof createAssistantSchema>) {
  return db.insert(assistant).values(ass).execute();
}

export function updateAssistant(ass: Static<typeof updateAssistantSchema>) {
  return db
    .update(assistant)
    .set(ass)
    .where(sql`${assistant.name} = ${ass.name}`);
}

export function getAssistant(id: number) {
  return db
    .select()
    .from(assistant)
    .where(sql`${assistant.id} = ${id}`);
}

export function getAssistantByName(name: string) {
  return db
    .select()
    .from(assistant)
    .where(sql`${assistant.name} = ${name}`);
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
