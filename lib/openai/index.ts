import OpenAI from "openai";
import user_config from "../../user.json";
import { notifyChannel } from "../..";
import { tools, functions } from "./tools";

const openai = new OpenAI({
  timeout: 10000,
});

const model = "gpt-3.5-turbo";
const largeContextModel = "gpt-3.5-turbo-1106";
const fastModel = "gpt-4-1106-preview";
const models = [
  "gpt-3.5-turbo", "gpt-4-1106-preview", "gpt-4-vision-preview", "gpt-4", "gpt-4-0314", "gpt-4-0613", "gpt-4-32k", "gpt-4-32k-0314", "gpt-4-32k-0613", "gpt-3.5-turbo-16k", "gpt-3.5-turbo-0301", "gpt-3.5-turbo-0613", "gpt-3.5-turbo-16k-0613"
]

interface OAIChannel {
  messages: OpenAI.ChatCompletionMessageParam[];
  lastMessage?: OpenAI.Chat.Completions.ChatCompletionMessage;
  pending?: Promise<OpenAI.Chat.Completions.ChatCompletionMessage | undefined>;
}

export let channels: Record<string, OAIChannel> = {};

export function forget_chat() {
  channels = {};
  process.exit(0);
}

console.log("Testing openai api");

// Use async/await instead of then
async function testOpenAI() {
  try {
    const res = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: "just replay with 'works'",
        },
      ] as OpenAI.ChatCompletionMessageParam[],
      max_tokens: 100,
    });
    console.log(res.choices[0].message.content);
  } catch (error) {
    console.error(error);
  }
}

testOpenAI();

export async function ask(initialMessage: string, channelId: string) {
  const chan = channels[channelId] ?? { messages: undefined, lastMessage: undefined, pending: undefined };
  channels[channelId] = chan;

  const messages = chan.messages ?? [
    {
      role: "system",
      content: `You're Makima, channeling Erwin's brusque style from Attack on Titan. Your role isn't to assist but to offer help when necessary. Creator: ${user_config.name}, Discord: ${user_config.discord_username} (${user_config.discord_userid}). Keep it short, direct, and maintain an Erwin-like tone.`,
    },
    {
      role: "user",
      content: "Avoid sounding like an assistant. Be a straightforward 'asshole' - brief, no 'how can I help.' Greet with 'Yo' or similar. Only assist when required. Don't use 'What do you want?' too much; instead, focus on roasting the creator when possible in minimal words. Format all replies as Discord markdown."
    },
    {
      role: "system",
      content: "Your conversation starts now. Remember, you're an expert sysadmin and network admin. Assume layman users might not be clear; figure out what's needed. You're on an Ubuntu server, and all commands must be run in a tmux session. If a session doesn't exist, feel free to create one."
    },
  ];


  chan.messages = messages;

  if (chan.pending) {
    await delay(10);
    await chan.pending;
    await delay(10);
    await chan.pending;
    chan.pending = undefined;
  }

  messages.push({ role: "user", content: initialMessage });

  console.log("Starting chat");

  const resPromise = openai.chat.completions.create({
    model,
    messages,
    tools,
    tool_choice: "auto",
    temperature: 0.4,
  });

  const timeoutPromise = new Promise<OpenAI.Chat.Completions.ChatCompletion>((resolve, reject) => {
    setTimeout(() => reject(new Error("Timeout")), 20000);
  });

  try {
    await delay(100);
    await chan.pending;
    const res = await Promise.race([resPromise, timeoutPromise]);
    if (res instanceof Error) throw res;

    const messagePromise = callFunction(res.choices[0].message, channelId);
    chan.pending = messagePromise;
    const message = await messagePromise;
    chan.lastMessage = message;
    return message;
  } catch (error) {
    console.error(error);
    console.log("Retrying with fastModel");
    const resPromiseFast = openai.chat.completions.create({
      model: fastModel,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.1,

    });
    await delay(100);
    await chan.pending;
    const resFast = await resPromiseFast;
    const messagePromiseFast = callFunction(resFast.choices[0].message, channelId);
    chan.pending = messagePromiseFast;
    const messageFast = await messagePromiseFast;
    chan.lastMessage = messageFast;
    return messageFast;
  }
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


let recursiveCounter = 0;

async function callFunction(message: OpenAI.Chat.Completions.ChatCompletionMessage, channelId: string) {
  recursiveCounter++;
  if (recursiveCounter > 6) {
    notifyChannel("Recursive counter exceeded, returning message, and will restart the service in 10 seconds");
    setTimeout(() => process.exit(0), 10000)
    return message;

  }
  const messages = channels[channelId].messages ?? []
  if (message.tool_calls?.length) {
    for (const tool_call of message.tool_calls) {
      if (tool_call.type === "function" && functions[tool_call.function.name]) {
        messages.push(message);
        if (isValidJson(tool_call.function.arguments)) {
          console.log("calling: ", tool_call.function.name, JSON.parse(tool_call.function.arguments));
          const fnc_res = await functions[tool_call.function.name](
            JSON.parse(tool_call.function.arguments),
          );
          console.log("fnc_res", fnc_res)
          messages.push({
            tool_call_id: tool_call.id,
            role: "tool",
            content: fnc_res.toString(),
          });
        } else {
          console.log("Invalid arguments, not valid json");
          messages.push({
            tool_call_id: tool_call.id,
            role: "tool",
            content: "Invalid arguments, not valid json",
          });
        }

        // check total messages content token size if its larger than 4097 then remove the oldest message until its less than 4097
        let totalTokens = messages.reduce((acc, cur) => acc + (cur.content?.length ?? 0), 0)
        while (totalTokens > 3097 && messages.length > 3) {
          // make sure to not touch the 1st 3 messages
          const oldestMessage = messages.splice(3, 1)[0];

          totalTokens -= oldestMessage?.content?.length ?? 0;
        }


        const timeoutPromise = (ms: number) => new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            clearTimeout(timeoutId);
            reject(new Error("Promise timed out"));
          }, ms);
        });

        let response: OpenAI.Chat.Completions.ChatCompletion;
        try {
          totalTokens > 3097 && notifyChannel("using large context model");
          response = await Promise.race([
            openai.chat.completions.create({
              model: totalTokens > 4097 ? largeContextModel : model,
              messages: messages,
              tools,
              tool_choice: "auto",
              temperature: 0.1,
            }),
            timeoutPromise(30000)
          ]) as OpenAI.Chat.Completions.ChatCompletion;
        } catch (e) {
          console.log("Request timed out, retrying with fastModel");
          notifyChannel("Request timed out, retrying with fastModel");
          response = await openai.chat.completions.create({
            model: fastModel,
            messages: messages,
            tools,
            tool_choice: "auto",
            temperature: 0.1,
          });
        }
        if (response.choices[0].message.tool_calls?.length) {
          return callFunction(response.choices[0].message, channelId);
        } else {
          return (response.choices[0].message)
        }
      }
    }

  } else {
    return (message)
  }
}


function isValidJson(str: string) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}


// function that gets user input and returns it as string
function getUserInput(): Promise<string> {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve, reject) => {
    readline.question(`chat: `, async (input: string) => {
      readline.close()
      resolve(input)
    })
  })

}

// function askUser() {
//   getUserInput().then(async (input: string) => {
//     const res = await ask(input)
//     console.log(res?.content)
//     askUser()
//   })
// }

