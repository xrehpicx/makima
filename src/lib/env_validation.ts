import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z
    .string()
    .refine((key) => key.startsWith("sk-"), "Invalid key format"),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  PORT: z.number().default(7777),
});

type Env = z.infer<typeof envSchema>;

export const ENV: Env = envSchema.parse(process.env);
