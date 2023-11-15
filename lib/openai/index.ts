import OpenAI from "openai";
import { functions, tools } from "./tools";
import user_config from "../../user.json";

const openai = new OpenAI({
  timeout: 10000,
});

const model = "gpt-3.5-turbo";

const messages: OpenAI.ChatCompletionMessageParam[] = [
  {
    role: "system",
    content: `You are a bot named makima with discord integration. your creator is ${user_config.name} and their discord username and user_id is ${user_config.discord_username} and ${user_config.discord_userid}. keep all replies short until told otherwise`,
  }
];

console.log("Testing openai api");
const res = await openai.chat.completions.create({
  model,
  messages: [
    {
      role: "user",
      content: "just replay with 'works'",
    }
  ] as OpenAI.ChatCompletionMessageParam[],
  max_tokens: 100,
});
console.log(res.choices[0].message.content)

export async function ask(initialMessage: string) {

  console.log("initialMessage", initialMessage)
  messages.push({
    role: "user",
    content: initialMessage,
  });

  console.log("Starting chat");
  const res = await openai.chat.completions.create({
    model,
    messages,
    tools,
    max_tokens: 150,
    tool_choice: "auto",
  });
  return await callFunction(res.choices[0].message)
}

async function callFunction(message: OpenAI.Chat.Completions.ChatCompletionMessage) {
  if (message.tool_calls?.length) {
    for (const tool_call of message.tool_calls) {
      console.log(tool_call);
      if (tool_call.type === "function" && functions[tool_call.function.name]) {
        messages.push(message);
        const fnc_res = functions[tool_call.function.name](
          JSON.parse(tool_call.function.arguments),
        );
        messages.push({
          tool_call_id: tool_call.id,
          role: "tool",
          content: fnc_res.toString(),
        });

        const secondResponse = await openai.chat.completions.create({
          model,
          messages: messages,
          tools,
          max_tokens: 150,
          tool_choice: "auto",
        });
        if (secondResponse.choices[0].message.tool_calls?.length) {
          callFunction(secondResponse.choices[0].message);
        } else {
          return (secondResponse.choices[0].message)
        }
      }
    }

  } else {
    return (message)
  }
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

