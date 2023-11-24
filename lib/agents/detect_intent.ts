import { makima_config } from "@/config";
import { notifyChannel } from "@/interfaces/discord";

import { Message } from "discord.js";

export async function is_to_makima(message: Message) {
  let messages = await message.channel.messages.fetch({
    around: message.id,
    limit: 10,
  });

  if (message.mentions.users.size > 0) {
    return false;
  }

  const messageAuthorsCount = Array.from(
    new Set(messages.map((m) => m.author.username))
  );

  console.log("last 10 messages are from: ", messageAuthorsCount);

  let oneMinuteAgo = Date.now() - 60000;

  const filteredMessages = messages.filter(
    (m) => m.createdTimestamp > oneMinuteAgo
  );

  const reply = filteredMessages.find(
    (m) =>
      (m.author.username
        .toLowerCase()
        .includes(makima_config.name.toLowerCase()) &&
        m.author.bot) ||
      m.content.toLowerCase().includes(makima_config.name.toLowerCase())
  );
  if (
    !reply &&
    messages.find(
      (m) =>
        (m.author.username
          .toLowerCase()
          .includes(makima_config.name.toLowerCase()) &&
          m.author.bot) ||
        m.content.toLowerCase().includes(makima_config.name.toLowerCase())
    )
  ) {
    const hasPermission =
      !Array.isArray(message.member?.roles) &&
      (message.member?.roles.cache.find((r) => r.name === "kin-dev") ||
        message.member?.roles.cache.find((r) => r.name === "makimatester"));

    // hasPermission &&
    //   notifyChannel(
    //     `Makima is not listening here, tag her to get her attention`,
    //     message.channel.id
    //   );
  }
  return reply;

  return false;
}
