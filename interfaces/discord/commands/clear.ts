import { clearThread } from "@/lib/openai/threads";
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
  Message,
} from "discord.js";

const command = new SlashCommandBuilder()
  .setName("clear")
  .setDescription("clear chat");

export const ClearConvoCommand = {
  command,
  async execute(
    interaction:
      | ChatInputCommandInteraction<CacheType>
      | MessageContextMenuCommandInteraction<CacheType>
      | UserContextMenuCommandInteraction<CacheType>
  ) {
    console.log("running restart command");
    await interaction.deferReply({ ephemeral: true });

    clearThread(interaction.channelId);
    interaction.channel?.send("Makima ai memory is cleared");
  },
};
