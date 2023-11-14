import OpenAI from "openai";
import { functions, tools } from "./tools";

const openai = new OpenAI();

const model = "gpt-3.5-turbo";
async function main() {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "user", content: "give me a special number based on 6" },
  ];

  const res = await openai.chat.completions.create({
    model,
    messages,
    stream: false,
    tools,
    max_tokens: 150,
    tool_choice: "auto",
  });

  res.choices[0].message.tool_calls?.forEach(async (tool_call) => {
    console.log(tool_call);
    if (tool_call.type === "function" && functions[tool_call.function.name]) {
      messages.push(res.choices[0].message);
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
      });
      console.log(secondResponse.choices[0]);
    }
  });
}

main();
