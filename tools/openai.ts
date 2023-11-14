import OpenAI from "openai";
import { functions, tools } from ".";

const openai = new OpenAI();

const model = "gpt-3.5-turbo";


const messages: OpenAI.ChatCompletionMessageParam[] = [
];

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
    stream: false,
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
          stream: false,
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

