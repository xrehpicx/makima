import { SlashCommandBuilder, ChatInputCommandInteraction, CacheType, MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction } from "discord.js";
import { ask } from "../tools/openai";

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
        interaction.deferReply()
        // check user role
        if (!(!Array.isArray(interaction.member?.roles) && interaction.member?.roles.cache.find(r => r.name === 'kin-dev'))) {
            await interaction.reply('You dont have enough permissions');
            return
        }
        const res = await ask(`${interaction.options.data.find(opt => opt.name === 'message')?.value}\nuser_id: ${interaction.member.user.id}\nchannelId: ${interaction.channelId}` as string)
        console.log("res", res)
        interaction.editReply(res?.content ?? "No reply from model")
    }
}