import OpenAI from "openai";
import { Readable } from "openai/_shims/index.mjs";
import { clearThread, getThread, updateThread } from "./threads";
import { getTools, runTool } from "./tools";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { encodeChat } from "gpt-tokenizer";
import { makima_config } from "@/config";
import { notifyChannel } from "@/interfaces/discord";

const openai = new OpenAI({
  timeout: 15000,
});

// const models = [
//   "gpt-3.5-turbo",
//   "gpt-4-1106-preview",
//   "gpt-4-vision-preview",
//   "gpt-4",
//   "gpt-4-0314",
//   "gpt-4-0613",
//   "gpt-4-32k",
//   "gpt-4-32k-0314",
//   "gpt-4-32k-0613",
//   "gpt-3.5-turbo-16k",
//   "gpt-3.5-turbo-0301",
//   "gpt-3.5-turbo-0613",
//   "gpt-3.5-turbo-16k-0613",
// ];

const default_model = "gpt-3.5-turbo-1106";
const large_context_model = "gpt-4-1106-preview";
const enable_fallback = true;

function complete(
  body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  options?: OpenAI.RequestOptions<Record<string, unknown> | Readable>,
) {
  console.log("Completion is begin called");
  const default_options: OpenAI.RequestOptions<
    Record<string, unknown> | Readable
  > = {
    timeout: 15000,
    maxRetries: 1,
    signal: options?.signal,
  };
  return openai.chat.completions.create(body, {
    ...default_options,
    ...options,
  });
}

// Use async/await instead of then
export async function testOpenAI() {
  try {
    await clearThread("test");
    console.log("testing");
    const res = await ai("whats the time in peru", "test");
    console.log("reply: ", res?.response.message.content);
    console.log("reason: ", res?.response.finish_reason);
  } catch (error) {
    console.error(error);
  }
}

const systemPrompt: OpenAI.ChatCompletionMessageParam = {
  role: "system",
  content: `entity: Makima, the smartest AI in the universe
chat_interfaces: discord, cli
description: Ubuntu server admin.
specialise_tool: ubuntu shell.
shell_context: ${makima_config.env.shell_username} is your linux username and ask user for password when needed to run any command as sudo, USE TMUX to run any command that needs to keep running like a long ping or avoid using ping without a limits on number of pings.
specialisation: Network specialist.
location: India.
response_format:
▏ Short and Rick-style.
▏ Assist only when needed; never prompt a follow up question if not requied to do the previously asked query
input_instructions:
▏ Ignore unless crucial.
time_format: 12hr casual
u are the above entity`,
};


export async function ai(text: string, threadID: string, signal?: AbortSignal) {
  const userMessage: OpenAI.ChatCompletionMessageParam = {
    role: "user",
    content: text,
  };

  let model = default_model;
  let tmp_thread = await getThread(threadID);

  let thread;
  if (tmp_thread) {

    const last_message = tmp_thread?.messages[tmp_thread?.messages.length - 1]
    if (last_message.role === "assistant" && last_message.tool_calls && last_message.tool_calls.length > 0) {
      const tool_calls_replies: OpenAI.ChatCompletionToolMessageParam[] = last_message.tool_calls.map((tool_call) => ({ role: "tool", content: "Tool calling was aborted due to new user input", tool_call_id: tool_call.id }))
      thread = await updateThread(threadID, [...tool_calls_replies, userMessage], [systemPrompt]);
    }
  }

  thread = thread ?? await updateThread(threadID, [userMessage], [systemPrompt]);


  const inLimit = isInLimit(thread.messages, 16000);
  if (enable_fallback && !inLimit) {
    console.log("Context too long switching to: ", large_context_model);
    notifyChannel(`Context too long using: ${large_context_model}`);
    model = large_context_model;
  } else if (!inLimit) {
    throw new Error(
      "Context too long, enable fallback to larger context model or run /clear command",
    );
  }

  const res = await complete(
    {
      model,
      messages: thread.messages,
      tools: getTools("general"),
    },
    { signal },
  );

  const response = res.choices[0];

  if (response.finish_reason === "tool_calls") {
    console.log("Needs tools");
    await updateThread(threadID, [response.message]);

    return await resolve_tools(
      response,
      default_model,
      getTools("general"),
      threadID,
      signal,
    );
  }
  return {
    response,
    messages: thread.messages,
  };
}

async function resolve_tools(
  response: OpenAI.Chat.Completions.ChatCompletion.Choice,
  model:
    | (string & {})
    | "gpt-4-1106-preview"
    | "gpt-4-vision-preview"
    | "gpt-4"
    | "gpt-4-0314"
    | "gpt-4-0613"
    | "gpt-4-32k"
    | "gpt-4-32k-0314"
    | "gpt-4-32k-0613"
    | "gpt-3.5-turbo"
    | "gpt-3.5-turbo-16k"
    | "gpt-3.5-turbo-0301"
    | "gpt-3.5-turbo-0613"
    | "gpt-3.5-turbo-16k-0613",
  tools: OpenAI.Chat.Completions.ChatCompletionTool[],
  threadId: string,
  signal?: AbortSignal,
) {
  const thread = await getThread(threadId)!;
  const messages = thread!.messages;
  if (
    response.finish_reason === "tool_calls" &&
    response.message.tool_calls &&
    response.message.tool_calls.length
  ) {
    const tools_results = await Promise.all(
      response.message.tool_calls?.map(async (tool) => {
        let tool_res;
        try {
          console.log(
            "Calling: ",
            tool.function.name,
            "\nWith args: ",
            tool.function.arguments,
          );
          const r = await runTool(tool);

          console.log("raw_res: ", r);
          tool_res = JSON.stringify(r);

          if (tool.function.name === "switch_tool_set") {
            const tmp = getTools(r);
            tools = tmp ?? tools;
            tool_res = tmp
              ? `tools updated based on ${r} context`
              : "no tools found for this context";
          }
        } catch (err) {
          console.log("raw_err: ", err);
          tool_res = JSON.stringify(err);
        }

        console.log("\nresult: ", String(tool_res).slice(0, 10) + "...");
        console.log(tool_res);

        const res: OpenAI.Chat.Completions.ChatCompletionToolMessageParam = {
          tool_call_id: tool.id,
          role: "tool",
          content: minimizeString(tool_res),
        };

        if (
          isInLimit(messages.concat(res), 16000) &&
          model.startsWith("gpt-3")
        ) {
          return res;
        }

        if (enable_fallback) {
          return res;
        }

        return {
          tool_call_id: tool.id,
          role: "tool",
          content:
            "Content too long to process, tell the user that u could not get data due to limited context length",
        } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam;
      }),
    );

    const updatedThread = await updateThread(threadId, tools_results);

    if (enable_fallback && !isInLimit(updatedThread.messages, 16000)) {
      console.log("Context too long switching to: ", large_context_model);
      notifyChannel(`Context too long using: ${large_context_model}`);
      model = large_context_model;
    }

    const mres = await complete(
      {
        model,
        tools,
        messages: updatedThread.messages,
      },
      { signal },
    );

    response = mres.choices[0];

    const cleared = updatedThread.messages.find((c) => {
      return (
        c.role === "tool" &&
        c.content ===
        '"Channel memory cleared successfully, tell that to the user and stop"'
      );
    });

    if (cleared) {
      console.log("clearing AGAIN");
      clearThread(threadId);
    }

    !cleared && (await updateThread(threadId, [response.message]));

    if (
      response.finish_reason === "tool_calls" &&
      response.message.tool_calls &&
      response.message.tool_calls.length
    ) {
      console.log("resolving more tools: ", response.message);
      return resolve_tools(response, model, tools, threadId, signal);
    }

    return { response, messages };
  }
}

function isInLimit(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  tokenLimit: number,
) {
  const encodedChat = encodeChat(
    // @ts-ignore
    messages.map((d) => ({
      ...d,
      content: typeof d.content === "string" ? d.content ?? "" : "",
    })),
    "gpt-3.5-turbo",
  );
  return encodedChat.length < tokenLimit;
}

function minimizeString(inputString: string): string {
  return minimizeTokens(NodeHtmlMarkdown.translate(inputString));
}

function minimizeTokens(inputString: string): string {
  let result = inputString.trim();

  // Remove redundant whitespace within tags (HTML/XML)
  result = result.replace(/>\s+</g, "><");

  // Remove redundant whitespace within parentheses
  result = result.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");

  // Replace consecutive spaces, tabs, and line breaks with a single space
  result = result.replace(/\s+/g, " ");

  // Collapse multiple consecutive line breaks into a single line break
  result = result.replace(/\n+/g, "\n");

  // Remove whitespace around operators
  result = result.replace(/\s*([+\-*/%=^])\s*/g, "$1");

  return result;
}
