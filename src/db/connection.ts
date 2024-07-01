import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { ENV } from "../lib/env_validation";
import * as schema from "./schema";

export const client = new Client({
  connectionString: ENV.DATABASE_URL,
});

try {
  await client.connect();
} catch (error) {
  console.error("Failed to connect to the database", error);
  process.exit(1);
}

export const db = drizzle(client, { schema });
