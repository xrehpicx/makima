import { SlashCommandBuilder, ChatInputCommandInteraction, CacheType, MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction, Message } from "discord.js";
import { ask } from "../lib/openai";

const command = new SlashCommandBuilder()
    .setName('chat')
    .setDescription('control stuff')
    .addStringOption(option =>
        option.setName('message')
            .setDescription('message to send')
            .setRequired(true)
    )

export const OpenAiCommand = {
    command,
    async execute(interaction: ChatInputCommandInteraction<CacheType> | MessageContextMenuCommandInteraction<CacheType> | UserContextMenuCommandInteraction<CacheType>) {
        console.log("running chat command")
        await interaction.user.send("Running chat command")
        // check user role
        if (!(!Array.isArray(interaction.member?.roles) && interaction.member?.roles.cache.find(r => r.name === 'kin-dev'))) {
            await interaction.user.send("Running chat command")
            return
        }
        const res = await ask(`${interaction.options.data.find(opt => opt.name === 'message')?.value}\nuser_id: ${interaction.member.user.id}\nchannelId: ${interaction.channelId}` as string)
        console.log("res", res)
        interaction.editReply(res?.content ?? "No reply from model")
    }
}


export const handleDM = async (message: Message<boolean>) => {
    console.log("message", message.content)
    const stopTyping = typingController(message)
    const res = await ask(`${message.content}\nuser_id: ${message.author.id}\nchannelId: ${message.channelId}` as string).finally(() => stopTyping())
    console.log("res", res?.content)
    message.channel.send(res?.content ?? "No reply from model")
}

// keep sending typing events to keep the bot typing until its stopped from the retuned controller
function typingController(message: Message<boolean>) {
    const interval = setInterval(() => {
        message.channel.sendTyping()
    }, 2000)
    return () => {
        clearInterval(interval)
    }
}

