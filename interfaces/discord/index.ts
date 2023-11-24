import {
  ActivityType,
  ChannelType,
  Client,
  GatewayIntentBits,
  Message,
  Partials,
  REST,
  Routes,
} from "discord.js";
import { TextChannel } from "discord.js";

import { makima_config as config } from "@/config";
import { RestartCommand } from "./commands/restart";
import { OpenAiCommand } from "./commands/openai";
import { ClearConvoCommand } from "./commands/clear";
import { is_to_makima } from "@/lib/agents/detect_intent";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const token = String(process.env.DISCORD_BOT_TOKEN);
const clientId = String(process.env.DISCORD_CLIENT_ID);

if (!token) {
  throw new Error("No token provided");
}
if (!clientId) {
  throw new Error("No client id provided");
}

const commands = [RestartCommand, ClearConvoCommand, OpenAiCommand];

const rest = new REST({ version: "10" }).setToken(token);

try {
  console.log("Started refreshing application (/) commands.");

  await rest.put(Routes.applicationCommands(clientId), {
    body: commands.map((c) => c.command.toJSON()),
  });

  console.log("Successfully reloaded application (/) commands.");
} catch (error) {
  console.error(error);
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  client.user?.setActivity("with your mind", {
    type: Number(ActivityType.Playing),
  });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const isDm = message.channel?.type === ChannelType.DM;

  if (isDm && config.admins.includes(message.author.id)) {
    OpenAiCommand.message_handler(message);
    return;
  }

  const hasPermission =
    !Array.isArray(message.member?.roles) &&
    (message.member?.roles.cache.find((r) => r.name === "kin-dev") ||
      message.member?.roles.cache.find((r) => r.name === "makimatester"));

  if (hasPermission && message.mentions.has(client.user?.id as string)) {
    OpenAiCommand.message_handler(message);
    return;
  }

  const ref_message = await is_to_makima(message);
  if (hasPermission && ref_message) {
    OpenAiCommand.message_handler(
      message,
      ref_message instanceof Message ? ref_message : undefined
    );
    return;
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  for (let com of commands) {
    if (com.command.name === commandName) {
      await com.execute(interaction);
    }
  }
});

export function notifyChannel(
  message: string,
  channelId = config.notification_channel
) {
  const channel = client.channels.cache.find((id) => id.id === channelId);
  if (channel?.isDMBased()) {
    channel.isTextBased() && channel.send(message);
  } else if (channel instanceof TextChannel) {
    (channel as TextChannel).send(message);
  }
}

export function sendSystemMessage(content: string) {
  notifyChannel(content, config.system_channel);
}

export function getClient() {
  return client;
}

export async function setup_discord() {
  await client.login(token);
  notifyChannel("Makima restarted");
  return client;
}
