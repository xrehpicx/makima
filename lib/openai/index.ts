import OpenAI from "openai";
import { functions, tools } from "./tools";
import user_config from "../../user.json";
import { APIPromise } from "openai/core.mjs";

const openai = new OpenAI({
  timeout: 10000,
});

// const model = "gpt-4-1106-preview";
const model = "gpt-3.5-turbo";
const largeContextModel = "gpt-3.5-turbo-1106"
const fastModel = "gpt-4-1106-preview"


interface OAIChannel {
  messages: OpenAI.ChatCompletionMessageParam[],
  lastMessage?: OpenAI.Chat.Completions.ChatCompletionMessage,
  pending?: Promise<OpenAI.Chat.Completions.ChatCompletionMessage | undefined> | APIPromise<OpenAI.Chat.Completions.ChatCompletion>,
}

export const channels: Record<string, OAIChannel> = {

}

console.log("Testing openai api");
openai.chat.completions.create({
  model,
  messages: [
    {
      role: "user",
      content: "just replay with 'works'",
    }
  ] as OpenAI.ChatCompletionMessageParam[],
  max_tokens: 100,
}).then(res => {
  console.log(res.choices[0].message.content)
})


export async function ask(initialMessage: string, channelId: string) {

  const chan = channels[channelId] ?? {
    messages: undefined,
    lastMessage: undefined,
    pending: undefined,
  }
  channels[channelId] = chan
  const messages = chan.messages ?? [
    {
      role: "system",
      content: `Your creator is ${user_config.name}, identified by their Discord username (${user_config.discord_username}) and user ID (${user_config.discord_userid}). Keep responses concise and direct. Avoid sharing user IDs and channel IDs unless explicitly instructed. Maintain a neutral and succinct tone in your replies.`,
    }
  ];
  chan.messages = messages

  // chan.pending could resolve and be set again very fast find a way to debounce this using the delay
  if (chan.pending) {
    await delay(1000)
    await chan.pending
    await delay(1000)
    await chan.pending
    chan.pending = undefined
  }

  messages.push({
    role: "user",
    content: initialMessage,
  });

  console.log("Starting chat");
  const resPromise = openai.chat.completions.create({
    model,
    messages,
    tools,
    tool_choice: "auto",
    temperature: 0.1
  });

  const timeoutPromise = new Promise<OpenAI.Chat.Completions.ChatCompletion>((resolve, reject) => {
    setTimeout(() => reject(new Error("Timeout")), 10000);
  });

  try {
    const res = await Promise.race([resPromise, timeoutPromise]);
    if (res instanceof Error) {
      throw res;
    }
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
      temperature: 0.1
    });
    const resFast = await resPromiseFast;
    const messagePromiseFast = callFunction(resFast.choices[0].message, channelId);
    chan.pending = messagePromiseFast;
    const messageFast = await messagePromiseFast;
    chan.lastMessage = messageFast;
    return messageFast;
  }

  // chan.pending = resPromise
  // const res = await resPromise

  // const messagePromise = callFunction(res.choices[0].message, channelId)

  // chan.pending = messagePromise
  // const message = await messagePromise
  // chan.lastMessage = message
  // return message

}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callFunction(message: OpenAI.Chat.Completions.ChatCompletionMessage, channelId: string) {
  console.log(channelId, channels)
  const messages = channels[channelId].messages ?? []
  if (message.tool_calls?.length) {
    for (const tool_call of message.tool_calls) {
      console.log(tool_call);
      if (tool_call.type === "function" && functions[tool_call.function.name]) {
        messages.push(message);
        if (isValidJson(tool_call.function.arguments)) {
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
        while (totalTokens > 4097 && messages.length > 3) {
          const oldestMessage = messages.shift();
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
          response = await Promise.race([
            openai.chat.completions.create({
              model: totalTokens > 4097 ? largeContextModel : model,
              messages: messages,
              tools,
              tool_choice: "auto",
              temperature: 0.1
            }),
            timeoutPromise(10000)
          ]) as OpenAI.Chat.Completions.ChatCompletion;
        } catch (e) {
          console.log("Request timed out, retrying with fastModel");
          response = await openai.chat.completions.create({
            model: fastModel,
            messages: messages,
            tools,
            tool_choice: "auto",
            temperature: 0.1
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

