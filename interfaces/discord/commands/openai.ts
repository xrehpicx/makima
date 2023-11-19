import { ai } from "@/lib/openai";
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
  Message,
} from "discord.js";

const command = new SlashCommandBuilder()
  .setName("chat")
  .setDescription("control stuff")
  .addStringOption((option) =>
    option
      .setName("message")
      .setDescription("message to send")
      .setRequired(true),
  );

let pending: { id: string; controller: AbortController }[] = [];

export const OpenAiCommand = {
  command,
  async execute(
    interaction:
      | ChatInputCommandInteraction<CacheType>
      | MessageContextMenuCommandInteraction<CacheType>
      | UserContextMenuCommandInteraction<CacheType>,
  ) { },
  async message_handler(message: Message) {
    const oldReq = pending.find((p) => p.id === message.channelId);
    if (oldReq) {
      console.log("aborting old req");
      oldReq.controller.abort();
      pending = pending.filter((c) => c.id !== message.channelId);
    }

    const controller = new AbortController();
    try {
      pending.push({ id: message.channelId, controller });
      const meta = {
        message_meta_data: {
          author: message.author.username,
          channel_id: message.channelId,
          time_stamp: message.createdTimestamp,
          interface: "discord",
        },
      };
      const stopTyping = handleTyping(message);
      const res = await ai(
        `${message.content}\n${JSON.stringify(meta)}`,
        message.channelId,
        controller.signal,
      );
      stopTyping();
      message.channel.send(
        res?.response.message.content ??
        `Something went wrong: ${JSON.stringify(res?.response)}`,
      );
      pending = pending.filter((c) => c.id !== message.channelId);
    } catch (err) {
      message.channel.send(`Something went wrong: ${String(err)}`);
      if (controller.signal.aborted) {
        console.log(`Something went wrong: ${String(err)}`);
      } else {
        controller.abort();
      }
    }
  },
};

function handleTyping(message: Message) {
  message.channel.sendTyping();
  const interval = setInterval(() => {
    message.channel.sendTyping();
  }, 5000);
  return () => clearInterval(interval);
}
