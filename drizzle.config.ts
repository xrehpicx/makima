import { defineConfig } from "drizzle-kit";
import { ENV } from "./src/lib/env_validation";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: ENV.DATABASE_URL,
  },
});
