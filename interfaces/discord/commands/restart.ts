import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
  Message,
} from "discord.js";

const command = new SlashCommandBuilder()
  .setName("restart")
  .setDescription("restart service");

export const RestartCommand = {
  command,
  async execute(
    interaction:
      | ChatInputCommandInteraction<CacheType>
      | MessageContextMenuCommandInteraction<CacheType>
      | UserContextMenuCommandInteraction<CacheType>
  ) {
    console.log("running restart command");
    await interaction.deferReply({ ephemeral: true });

    // Check user role
    if (
      !(
        !Array.isArray(interaction.member?.roles) &&
        interaction.member?.roles.cache.find(
          (r) => r.name === "kin-dev" || r.name === "tokio"
        )
      )
    ) {
      await interaction.user.send("not enough permissions?");
      return;
    }

    await interaction.editReply("Restarting service");
    setTimeout(() => process.exit(0), 1000);
  },
};
