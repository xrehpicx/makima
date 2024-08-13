import { createInsertSchema } from "drizzle-typebox";
import { db } from "./connection";
import { threads, messages } from "./schema";
import { sql } from "drizzle-orm";
import { redisClient } from "./redis";
import { t } from "elysia";
import OpenAI from "openai";

export const createThreadSchema = createInsertSchema(threads);
export const createMessageSchema = createInsertSchema(messages, {
  threadId: t.Numeric(),
});

// threads controller
export function createThread(name: string) {
  return db.insert(threads).values({ name }).returning().execute();
}

// identifier can be thread name or the thread id
export function updateUsage(
  identifier: string | number,
  usage: OpenAI.Completions.CompletionUsage,
) {
  let query;
  if (typeof identifier === "string") {
    query = sql`${threads.name} = ${identifier}`;
  } else if (typeof identifier === "number") {
    query = sql`${threads.id} = ${identifier}`;
  } else {
    throw new Error("Invalid identifier type");
  }

  return db.update(threads).set({ usage }).where(query).execute();
}

export function getThread(identifier: number | string) {
  let whereCondition;

  if (typeof identifier === "number") {
    whereCondition = sql`${threads.id} = ${identifier} AND ${threads.disabled} = false`;
  } else if (typeof identifier === "string") {
    whereCondition = sql`${threads.name} = ${identifier} AND ${threads.disabled} = false`;
  } else {
    throw new Error("Invalid identifier type");
  }

  return db
    .select()
    .from(threads)
    .where(whereCondition)
    .groupBy(threads.id)
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

export async function getThreadID(name: string) {
  const res = await db
    .select({ id: threads.id })
    .from(threads)
    .where(sql`${threads.name} = ${name}`)
    .execute();

  if (res.length === 0) {
    throw new Error("Thread not found");
  }

  return res[0].id;
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

export function enableThread(name: string) {
  return db
    .update(threads)
    .set({ disabled: false })
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

export async function getMessages({
  threadIdentifier,
  limit,
  page,
}: {
  threadIdentifier: number | string;
  limit?: number;
  page?: number;
}) {
  const threadId =
    typeof threadIdentifier === "string"
      ? await getThreadID(threadIdentifier)
      : threadIdentifier;

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

  return await que.execute();
}

export function deleteMessage(id: number) {
  return db.delete(messages).where(sql`${messages.id} = ${id}`);
}

export function deleteMessages(threadId: number) {
  return db.delete(messages).where(sql`${messages.threadId} = ${threadId}`);
}
