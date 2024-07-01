import { name } from "drizzle-orm";
import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  vector,
  boolean,
} from "drizzle-orm/pg-core";

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  keyName: text("key_name").notNull(),
  apiKey: text("api_key").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assistant = pgTable("assistant", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  prompt: text("prompt").notNull(),
  model: text("model").default("gpt-4o"),
  enabled: boolean("enabled").default(true),
});

export const threads = pgTable("threads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  disabled: boolean("disabled").default(false),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id")
    .references(() => threads.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  role: text("role").notNull(),
  content: text("content"),
  tool_call_id: text("tool_call_id"),
  tool_calls: text("tool_calls"),
  name: text("name"),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id")
    .references(() => threads.id)
    .notNull(),
  document: text("document").notNull(),
  type: text("type").notNull(),
  url: text("url").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
