import { notifyChannel } from "@/interfaces/discord";

export function schedule_discord_message({
  channel_id,
  message,
}: {
  channel_id: string;
  message: string;
}) {
  notifyChannel(message, channel_id);
  return "Message is scheduled";
}
