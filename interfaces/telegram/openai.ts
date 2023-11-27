import { makima_config } from "@/config";
import { ai } from "@/lib/openai";
import { Context, NarrowedContext, Telegraf, Types } from "telegraf";
import { message } from "telegraf/filters";
import { notifyChannel } from "../discord";
import { clearThread } from "@/lib/openai/threads";
import { nanoid } from "nanoid";
import { memory_manager } from "@/lib/openai/tools/memory_agent";

let messages_que: { id: number; controller: AbortController }[] = [];
export function openai_telegram_interface_init(bot: Telegraf<Context>) {
  bot.textMention("makima", (ctx) => {
    ctx.reply("Yes?");
  });

  bot.command("clear", async (ctx) => {
    if (
      ctx.message.from.username ===
      makima_config.interfaces.telegram.admin_username
    ) {
      await clearThread(String(ctx.chat.id));
      await ctx.reply("Cleared ai memory");
    }
  });

  bot.command("gym", async (ctx) => {
    clear_all_typing();
    const stopTyping = handleTyping(() => ctx.sendChatAction("typing"));
    if (
      ctx.message.from.username ===
      makima_config.interfaces.telegram.admin_username
    ) {
      await memory_manager(
        { makima_prompt: "recall my gym stats" },
        {
          interface: "telegram",
          user: ctx.message.from.username,
          meta: {},
          channel_id: ctx.chat.id.toString(),
        }
      );
    }
    stopTyping();
  });

  bot.on(message("text"), (ctx) => {
    clear_all_typing();
    const stopTyping = handleTyping(() => ctx.sendChatAction("typing"));
    (async () => {
      console.log(ctx.chat.id);
      if (
        ctx.message.from.username ===
        makima_config.interfaces.telegram.admin_username
      ) {
        const oldReq = messages_que.find((p) => p.id === ctx.chat.id);
        if (oldReq) {
          console.log("aborting old req");
          oldReq.controller.abort();
          messages_que = messages_que.filter((c) => c.id !== ctx.chat.id);
        }

        const controller = new AbortController();

        const repliedTo =
          ctx.message.reply_to_message && "text" in ctx.message.reply_to_message
            ? ctx.message.reply_to_message
            : null;
        try {
          messages_que.push({ id: ctx.chat.id, controller });
          const meta = {
            message_meta_data: {
              author: ctx.message.from.username,
              channel_id: ctx.chat.id,
              time_stamp: ctx.message.date,

              reference_message: {
                author: repliedTo?.from?.username,
                time_stamp: repliedTo?.date,
              },
            },
          };
          const res = await ai(
            `${
              repliedTo?.text
                ? `context_message_content: ${repliedTo?.text}\ncurrent_message: ${ctx.message.text}\ncurrent_message_author:${ctx.message.from.username}`
                : `${ctx.message.text}`.trim().toLowerCase()
            }`,
            String(ctx.chat.id),
            {
              signal: controller.signal,
              context: {
                interface: "telegram",
                user: ctx.message.from.username,
                channel_id: ctx.chat.id.toString(),
                meta,
                signal: controller.signal,
              },
              onAssistantMessage: (mess) => {
                console.log("assistant message", mess);
              },
            }
          );

          stopTyping();
          if (!res?.response.message.content) {
            notifyChannel(
              `Something went wrong: ${JSON.stringify(res?.response)}`
            );
            const mess = await ctx.reply("Something went wrong");
            setTimeout(() => ctx.deleteMessage(mess.message_id), 1000);
          } else {
            ctx.reply(res.response.message.content);
          }

          messages_que = messages_que.filter((c) => c.id !== ctx.chat.id);
        } catch (err) {
          stopTyping();
          if (controller.signal.aborted) {
            console.log(`Something went wrong: ${String(err)}`);
          } else {
            notifyChannel(`Something went wrong: ${String(err)}`);
            controller.abort();
          }
        }
      }
    })().then(() => {
      stopTyping();
    });
  });

  bot.on(message("document"), async (ctx) => {
    console.log(ctx.message.document);
  });
}

let pending_typing: { id: string; interval: NodeJS.Timeout }[] = [];
const clear_all_typing = () => {
  pending_typing.forEach((p) => {
    clearInterval(p.interval);
  });
  pending_typing = [];
};
function handleTyping(type: () => void) {
  type();
  const interval = setInterval(() => {
    type();
  }, 5000);
  const id = nanoid();
  pending_typing.push({ id, interval });
  return () => {
    clearInterval(interval);
    pending_typing = pending_typing.filter((p) => p.id !== id);
  };
}
