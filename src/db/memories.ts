import { sql } from "drizzle-orm";
import { db } from "./connection";
import { memories } from "./schema";
import { createInsertSchema } from "drizzle-typebox";
import { Static, t } from "elysia";

// Define schemas for creating and updating memories
export const createMemorySchema = createInsertSchema(memories, {
  threadId: t.Number(),
  assistantId: t.Number(),
  memory: t.Any(),
});

export const updateMemorySchema = t.Object({
  id: t.Number(),
  memory: t.Optional(t.Any()),
});

// Function to create a new memory
export function createMemory(mem: Static<typeof createMemorySchema>) {
  return db.insert(memories).values(mem).returning().execute();
}

// Function to update an existing memory
export function updateMemory(mem: Static<typeof updateMemorySchema>) {
  return db
    .update(memories)
    .set(mem)
    .where(sql`${memories.id} = ${mem.id}`)
    .execute();
}

// Function to get memory by ID
export function getMemoryById(id: number) {
  return db
    .select()
    .from(memories)
    .where(sql`${memories.id} = ${id}`)
    .execute();
}

// Function to get all memories by thread ID
export function getMemoriesByThreadId(threadId: number) {
  return db
    .select()
    .from(memories)
    .where(sql`${memories.threadId} = ${threadId}`)
    .execute();
}

// Function to get all memories by assistant ID
export function getMemoriesByAssistantId(assistantId: number) {
  return db
    .select()
    .from(memories)
    .where(sql`${memories.assistantId} = ${assistantId}`)
    .execute();
}

// Function to delete a memory by ID
export function deleteMemoryById(id: number) {
  return db.delete(memories).where(sql`${memories.id} = ${id}`).execute();
}
