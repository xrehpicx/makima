import { notifyChannel } from "@/interfaces/discord";
import { ContextType, ai } from "..";
import { format, isValid, parseISO } from "date-fns";
import { notify_telegram_channel } from "@/interfaces/telegram";

export async function schedule_task(
  {
    instruction: task_description,
    time,
  }: { instruction: string; time: string; channel_id: string },
  context?: ContextType
) {
  const channel_id = context?.channel_id;

  if (!channel_id) {
    return "Not enough context data to run this task, channel_id is required";
  }

  const scheduledTime = parseISO(time);

  if (!isValid(scheduledTime)) {
    return "Invalid time format. Please use a valid ISO time string.";
  }

  if (scheduledTime.getTime() - Date.now() < 0) {
    console.log(
      scheduledTime.getTime() - Date.now(),
      "ms",
      scheduledTime.getTime(),
      Date.now()
    );
    return "Invalid time. The scheduled time should be in the future. ask the user for new future time or retry time format";
  }

  notifyChannel(
    `Scheduling task: ${task_description} at ${format(
      scheduledTime,
      "h:mm a"
    )} for channel: ${channel_id} and user: ${context?.user}`
  );

  const schedule = setTimeout(async () => {
    notifyChannel(
      `Running scheduled task: ${task_description} at ${format(
        scheduledTime,
        "h:mm a"
      )} for channel: ${channel_id} and user: ${context?.user}` ??
        "schedule_task failed"
    );

    try {
      const res = await ai(task_description, channel_id, { context });
      if (context.interface === "telegram") {
        notify_telegram_channel(
          res?.response.message.content ?? "schedule_task failed",
          channel_id
        );
      } else {
        notifyChannel(
          res?.response.message.content ?? "schedule_task failed",
          channel_id
        );
      }
    } catch (error) {
      notifyChannel(
        `Scheduled task threw an error: ${String(error)}`,
        channel_id
      );
      notifyChannel(`Scheduled task threw an error: ${String(error)}`);
    }
  }, scheduledTime.getTime() - Date.now());

  return `Task scheduled for ${format(scheduledTime, "h:mm a")}, reply to user`;
}
