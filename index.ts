import { ActivityType, ChannelType, Client, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import { OpenAiCommand, handleDM } from './commands/openai';
import { TextChannel } from 'discord.js';
import config from './user.json';
import { RestartCommand } from './commands/restart';
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
    OpenAiCommand, RestartCommand
];

const rest = new REST({ version: '10' }).setToken(token);

try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(clientId), { body: commands.map(c => c.command.toJSON()) });

    console.log('Successfully reloaded application (/) commands.');
} catch (error) {
    console.error(error);
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    notifyChannel("Makima is online")
    client.user?.setActivity("with your mind", { type: Number(ActivityType.Playing) });

    // config.admins.forEach(id => {
    //     client.users.createDM(id)
    //     client.users.fetch(id).then(user => {
    //         user.send("Makima is online")
    //     })
    // })
})

export function notifyAdmins(message: string) {
    config.admins.forEach(id => {
        client.users.fetch(id).then(user => {
            user.send(message)
        })
    })
}

export function notifyChannel(message: string, channelId: string = config.notification_channel) {
    const channel = client.channels.cache.find(id => id.id === channelId);
    if (channel?.isDMBased()) {
        channel.isTextBased() && (channel).send(message);
    } else if (channel instanceof TextChannel) {
        (channel as TextChannel).send(message);
    }
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const isDm = message.channel?.type === ChannelType.DM;

    if (isDm && config.admins.includes(message.author.id)) {
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
    return "Presence set to" + "" + type + " " + message + " Successfully, reply to the user that the presence was set Successfully"
}

export function scheduleBotMessage({ message, channelId, time }: { message: string, time: number, channelId: string }) {
    setTimeout(() => {
        const channel = client.channels.cache.find(id => id.id === channelId);
        if (channel?.isDMBased()) {
            channel.isTextBased() && (channel).send(message);
        } else if (channel instanceof TextChannel) {
            (channel as TextChannel).send(message);
        }
    }, time);
    return `Message will be sent after ${time} milliseconds, reply to the user that the message was scheduled to be sent after ${time} milliseconds`
}

// Log in to Discord
client.login(token);

export const discordClient = client;