import { z, ZodError } from "zod";

const creatorSchema = z.object({
  name: z.string(),
  discord_username: z.string(),
  discord_userid: z.string(),
});

const makimaConfigSchema = z.object({
  name: z.string(),
  creator: creatorSchema,
  admin_channels: z.array(z.string()),
  notification_channel: z.string(),
  system_channel: z.string(),
  admins: z.array(z.string()),
  interfaces: z.object({
    telegram: z.object({
      token: z.string(),
      admin_username: z.string(),
      notification_channel: z.string(),
    }),
  }),
  env: z.object({
    shell_username: z.string(),
    shell_password: z.string(),
    working_dir: z.string(),
    memory_dir: z.string(),
  }),
  agents: z.object({
    search_api_key: z.string(),
  }),
});

// Retrieve environment variables and parse them
export const makima_config = {
  name: process.env.MAKIMA_NAME!,
  creator: {
    name: process.env.MAKIMA_CREATOR_NAME!,
    discord_username: process.env.MAKIMA_DISCORD_USERNAME!,
    discord_userid: process.env.MAKIMA_DISCORD_USERID!,
  },
  interfaces: {
    telegram: {
      token: process.env.TELEGRAM_BOT_TOKEN!,
      admin_username: process.env.TELEGRAM_ADMIN!,
      notification_channel: process.env.TELEGRAM_NOTIFICATION_CHANNEL!,
    },
  },
  admin_channels: process.env.MAKIMA_ADMIN_CHANNELS?.split(",") || [],
  notification_channel: process.env.MAKIMA_NOTIFICATION_CHANNEL!,
  system_channel: process.env.MAKIMA_SYSTEM_CHANNEL!,
  admins: process.env.MAKIMA_ADMINS?.split(",") || [],
  env: {
    shell_username: process.env.MAKIMA_SHELL_USERNAME!,
    shell_password: process.env.MAKIMA_SHELL_PASSWORD!,
    working_dir: process.env.MAKIMA_WORKING_DIR!,
    memory_dir: process.env.MAKIMA_MEMORY_DIR!,
  },
  agents: {
    search_api_key: process.env.SEARCH_API_KEY!,
  },
};

// Validate the configuration against the schema
try {
  makimaConfigSchema.parse(makima_config);
  console.log("Configuration is valid!");
} catch (error) {
  if (error instanceof ZodError) {
    console.error("Configuration validation failed:", error.errors);
    process.exit(1); // Exit the program with a non-zero status code
  } else {
    console.error("An unexpected error occurred during validation:", error);
    process.exit(1); // Exit the program with a non-zero status code
  }
}
