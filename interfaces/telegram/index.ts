import { makima_config } from "@/config";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { openai_telegram_interface_init } from "./openai";

export const telegram_bot = new Telegraf(
  makima_config.interfaces.telegram.token
);
telegram_bot.start((ctx) => ctx.reply("Welcome"));
// bot.help((ctx) => ctx.reply(""));

openai_telegram_interface_init(telegram_bot);

export async function init_telegram() {
  console.log("Initializing telegram interface...");
  telegram_bot.launch();
  console.log("Telegram interface initialized");
  // const tmp = await telegram_bot.telegram.sendMessage(
  //   "@makima_notifications",
  //   "Test"
  // );

  // console.log(tmp.chat.id);
  // Enable graceful stop
  // process.once("SIGINT", () => telegram_bot.stop("SIGINT"));
  // process.once("SIGTERM", () => telegram_bot.stop("SIGTERM"));
}

export function notify_telegram_channel(
  message: string,
  channel_id: string | number = Number(
    makima_config.interfaces.telegram.notification_channel
  )
) {
  telegram_bot.telegram.sendMessage(Number(channel_id), message);
}
