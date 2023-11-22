import { getClient } from "@/interfaces/discord";
import { ActivityType } from "discord.js";

export function setBotPresence({
  message,
  type,
}: {
  message: string;
  type: ActivityType;
}) {
  const client = getClient();
  client.user?.setActivity(message, { type: Number(type) });
  return (
    "Presence set to" +
    "" +
    type +
    " " +
    message +
    " Successfully, reply to the user that the presence was set Successfully"
  );
}
