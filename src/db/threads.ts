import { createInsertSchema } from "drizzle-typebox";
import { db } from "./connection";
import { threads, messages } from "./schema";
import { sql } from "drizzle-orm";
import { redisClient } from "./redis";
import { t } from "elysia";

export const createThreadSchema = createInsertSchema(threads);
export const createMessageSchema = createInsertSchema(messages, {
  threadId: t.Numeric(),
});

// threads controller
export function createThread(name: string) {
  return db.insert(threads).values({ name }).execute();
}

export function getThread(threadId: number) {
  return db
    .select()
    .from(threads)
    .where(sql`${threads.id} = ${threadId} AND ${threads.disabled} = false`)
    .execute();
}

export function getThreadByName(name: string) {
  return db
    .select()
    .from(threads)
    .where(sql`${threads.name} = ${name} AND ${threads.disabled} = false`)
    .execute();
}

// check if thread exists and is enabled use count to reduce data transfer
export async function checkThread(identifier: string | number) {
  let query;
  if (typeof identifier === "string") {
    query = sql`${threads.name} = ${identifier} AND ${threads.disabled} = false`;
  } else if (typeof identifier === "number") {
    query = sql`${threads.id} = ${identifier} AND ${threads.disabled} = false`;
  } else {
    throw new Error("Invalid identifier type");
  }

  const res = await db
    .select({ count: sql`COUNT(*)` })
    .from(threads)
    .where(query)
    .execute();

  return (res[0].count as number) > 0;
}

export function getAllThreads() {
  return db.select().from(threads).execute();
}

export function disableThread(name: string) {
  return db
    .update(threads)
    .set({ disabled: true })
    .where(sql`${threads.name} = ${name}`);
}

export async function deleteThread(name: string) {
  // get thread id
  const thread = await db
    .select({ id: threads.id })
    .from(threads)
    .where(sql`${threads.name} = ${name}`)
    .execute();

  if (thread.length === 0) {
    throw new Error("Thread not found");
  }

  const threadId = thread[0].id;

  return await Promise.all([
    db
      .delete(threads)
      .where(sql`${threadId} = ${threadId}`)
      .execute(),
    db
      .delete(messages)
      .where(sql`${messages.threadId} = ${threadId}`)
      .execute(),
  ]);
}

export function getRunningStatus(name: string) {
  return redisClient.get(`thread-${name}`);
}

export function setRunningStatus(name: string, status: 1 | 0) {
  return redisClient.set(`thread-${name}`, status);
}

export function setStatusMessage(name: string, message: string) {
  return redisClient.set(`thread-${name}-status`, message);
}

// messages controller
export function createMessage({
  threadId,
  content,
  role,
  name,
  tool_call_id,
  tool_calls,
}: {
  threadId: number;
  content?: string | null;
  role: string;
  name?: string | null;
  tool_call_id?: string | null;
  tool_calls?: string | null;
}) {
  return db
    .insert(messages)
    .values({ threadId, content, role, name, tool_call_id, tool_calls })
    .execute();
}

export function getMessages({
  threadId,
  limit,
  page,
}: {
  threadId: number;
  limit?: number;
  page?: number;
}) {
  const que = db
    .select()
    .from(messages)
    .where(sql`${messages.threadId} = ${threadId}`);

  if (limit !== undefined && limit > 0) {
    que.limit(limit);
    if (page && page > 0) {
      que.offset(page * limit);
    }
  }

  return que.execute();
}

export function deleteMessage(id: number) {
  return db.delete(messages).where(sql`${messages.id} = ${id}`);
}

export function deleteMessages(threadId: number) {
  return db.delete(messages).where(sql`${messages.threadId} = ${threadId}`);
}
