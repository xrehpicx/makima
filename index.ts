import {
    ActivityType,
    ChannelType,
    Client,
    GatewayIntentBits,
    Partials,
    REST,
    Routes,
} from "discord.js";
import { TextChannel } from "discord.js";

import { makima_config as config } from "./config";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
});

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = String(process.env.DISCORD_CLIENT_ID);

if (!token) {
    throw new Error("No token provided");
}
if (!clientId) {
    throw new Error("No client id provided");
}

const commands: any[] = [];

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

export function notifyChannel(
    message: string,
    channelId: string = config.notification_channel,
) {
    const channel = client.channels.cache.find((id) => id.id === channelId);
    if (channel?.isDMBased()) {
        channel.isTextBased() && channel.send(message);
    } else if (channel instanceof TextChannel) {
        (channel as TextChannel).send(message);
    }
}

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const isDm = message.channel?.type === ChannelType.DM;

    // if (isDm && config.admins.includes(message.author.id)) {
    //     // console.log("is dm");
    //     // handleDM(message);
    //     return;
    // }
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
