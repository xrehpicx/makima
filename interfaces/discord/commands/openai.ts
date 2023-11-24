import { ai } from "@/lib/openai";
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
  Message,
} from "discord.js";
import { notifyChannel } from "..";

const command = new SlashCommandBuilder()
  .setName("chat")
  .setDescription("control stuff")
  .addStringOption((option) =>
    option
      .setName("message")
      .setDescription("message to send")
      .setRequired(true)
  );

export let messages_que: { id: string; controller: AbortController }[] = [];

export const OpenAiCommand = {
  command,
  async execute(
    interaction:
      | ChatInputCommandInteraction<CacheType>
      | MessageContextMenuCommandInteraction<CacheType>
      | UserContextMenuCommandInteraction<CacheType>
  ) {
    const oldReq = messages_que.find((p) => p.id === interaction.channelId);
    if (oldReq) {
      console.log("aborting old req");
      oldReq.controller.abort();
      messages_que = messages_que.filter((c) => c.id !== interaction.channelId);
    }

    const controller = new AbortController();

    interaction.deferReply();
    const messageContent = String(
      interaction.options.data.find((v) => v.name === "message")?.value
    );

    if (messageContent) {
      try {
        messages_que.push({ id: interaction.channelId, controller });
        const meta = {
          message_meta_data: {
            author: interaction.user.username,
            channel_id: interaction.channelId,
            time_stamp: interaction.createdTimestamp,
            interface: "discord",
          },
        };
        const res = await ai(messageContent, interaction.channelId, {
          signal: controller.signal,
          context: {
            user: interaction.user.username,
            channel_id: interaction.channelId,
            meta,
            signal: controller.signal,
          },
          onAssistantMessage: (mess) => {
            console.log("assistant message", mess);
            // mess.content && message.channel.send({ content: mess.content, allowedMentions: { repliedUser: false } });
          },
        });

        if (!res?.response.message.content) {
          notifyChannel(
            `Something went wrong: ${JSON.stringify(res?.response)}`
          );
        } else {
          interaction.editReply({ content: res?.response.message.content });
        }

        messages_que = messages_que.filter(
          (c) => c.id !== interaction.channelId
        );
      } catch (err) {
        notifyChannel(`Something went wrong: ${String(err)}`);
        if (controller.signal.aborted) {
          console.log(`Something went wrong: ${String(err)}`);
        } else {
          controller.abort();
        }
      }
    }
  },
  async message_handler(message: Message, ref_message?: Message) {
    const oldReq = messages_que.find((p) => p.id === message.channelId);
    if (oldReq) {
      console.log("aborting old req");
      oldReq.controller.abort();
      messages_que = messages_que.filter((c) => c.id !== message.channelId);
    }

    const controller = new AbortController();
    const stopTyping = handleTyping(message);

    const repliedTo = message.reference?.messageId
      ? await message.channel.messages.fetch(
          message.reference?.messageId as string
        )
      : null;

    try {
      messages_que.push({ id: message.channelId, controller });
      const meta = {
        message_meta_data: {
          author: message.author.username,
          channel_id: message.channelId,
          time_stamp: message.createdTimestamp,
          interface: "discord",
          reference_message: {
            author: repliedTo?.author.username,
            time_stamp: repliedTo?.createdTimestamp,
          },
        },
      };

      const res = await ai(
        `${
          repliedTo?.content
            ? `reference_message_content:${repliedTo?.content}\n${message.content}\nmessage_author:${message.author.username}`
            : `${message.content}`
        }${
          ref_message
            ? `\nsystem_detected_ref_message: content=${ref_message.content} author=${ref_message.author.username}`
            : ""
        }`,
        message.channelId,
        {
          signal: controller.signal,
          context: {
            user: message.author.username,
            channel_id: message.channelId,
            meta,
            signal: controller.signal,
          },
          onAssistantMessage: (mess) => {
            console.log("assistant message", mess);
            // mess.content && message.channel.send({ content: mess.content, allowedMentions: { repliedUser: false } });
          },
        }
      );
      stopTyping();
      if (!res?.response.message.content) {
        notifyChannel(`Something went wrong: ${JSON.stringify(res?.response)}`);
      } else {
        message.channel.send(res?.response.message.content);
      }

      messages_que = messages_que.filter((c) => c.id !== message.channelId);
    } catch (err) {
      stopTyping();
      if (controller.signal.aborted) {
        console.log(`Something went wrong: ${String(err)}`);
      } else {
        notifyChannel(`Something went wrong: ${String(err)}`);
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
