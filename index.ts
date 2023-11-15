import { ActivityType, ChannelType, Client, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import { OpenAiCommand, handleDM } from './commands/openai';
import { TextChannel } from 'discord.js';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel]
});

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = String(process.env.DISCORD_CLIENT_ID);

if (!token) {
    throw new Error('No token provided');
}
if (!clientId) {
    throw new Error('No client id provided');
}

const commands = [
    OpenAiCommand
];

const rest = new REST({ version: '10' }).setToken(token);

try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(clientId), { body: commands.map(c => c.command.toJSON()) });

    console.log('Successfully reloaded application (/) commands.');
} catch (error) {
    console.error(error);
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const isDm = message.channel?.type === ChannelType.DM;

    if (isDm) {
        console.log("is dm")
        handleDM(message)
        return
    }
})



client.on('interactionCreate', async interaction => {


    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    for (let com of commands) {
        if (com.command.name === commandName) {
            await com.execute(interaction)
        }
    }

});

export function setBotPresence({ message, type }: { message: string, type: ActivityType }) {
    client.user?.setActivity(message, { type: Number(type) });
    return "Presence set"
}

export function scheduleBotMessage({ message, channelId, time }: { message: string, time: number, channelId: string }) {
    setTimeout(() => {
        const channel = client.channels.cache.get(channelId);
        if (channel instanceof TextChannel) {
            channel.send(message);
        }
    }, time);
    return "Message scheduled"
}

// Log in to Discord
client.login(token);

export const discordClient = client;