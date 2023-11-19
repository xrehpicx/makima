import { clearThread } from "../threads";

export function forget_discord_conversation({
  channel_id,
}: {
  channel_id: string;
}) {
  try {
    clearThread(String(channel_id));
    return "Channel memory cleared successfully, tell that to the user and stop";
  } catch (err) {
    return String(err);
  }
}
