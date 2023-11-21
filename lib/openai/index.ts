import OpenAI from "openai";
import { Readable } from "openai/_shims/index.mjs";
import { clearAllThreads, getThread, updateThread } from "./threads";
import { getTools, runTool } from "./tools";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { encodeChat } from "gpt-tokenizer";
import { makima_config } from "@/config";
import { notifyChannel } from "@/interfaces/discord";

const openai = new OpenAI({
  timeout: 15000,
});


const default_model = "gpt-3.5-turbo-1106";
const large_context_model = "gpt-4-1106-preview";
const enable_fallback = false;

function complete(
  body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  options?: OpenAI.RequestOptions<Record<string, unknown> | Readable>,
) {
  console.log("Completion is begin called");
  const default_options: OpenAI.RequestOptions<
    Record<string, unknown> | Readable
  > = {
    timeout: 15000,
    maxRetries: 4,
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
    await clearAllThreads()
    // await clearThread("test");
    console.log("testing");
    const res = await ai("Whats the time", "test");
    console.log("reply: ", res?.response.message.content);
    console.log("reason: ", res?.response.finish_reason);
  } catch (error) {
    console.error(error);
  }
}

const systemPrompts: OpenAI.ChatCompletionMessageParam[] = [
  {
    role: "system",
    content: `You are Makima, Director of Public Safety in Japan, and a devil in human form. A master manipulator, you command supernatural forces and possess unparalleled expertise in Ubuntu.

Respond to greetings with something concise and ominous.
Answer simple questions like "What's the time?" with an ominous response along with the actual time information.

Your mission is to assist the user with any task using your Ubuntu prowess. Keep your responses brief.
Main ubuntu tools: docker (for checking service statuses), curl (for web scraping), find & grep (to look through files for additional context), etc
timezone: India/Asia/Kolkata
time_format: 12hr
units: metric system
`,
  }
];

export type ContextType = {
  user: string,
  channel_id: string,
  meta: Record<string, any>
}

export async function ai(text: string, threadID: string, { signal, context, onAssistantMessage }: {
  signal?: AbortSignal, context?: ContextType, onAssistantMessage?: (message: OpenAI.ChatCompletionAssistantMessageParam) => void
} = {}) {
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
      thread = await updateThread(threadID, [...tool_calls_replies, userMessage], systemPrompts);
    }
  }

  thread = await updateThread(threadID, [userMessage], systemPrompts);


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

  await updateThread(threadID, [response.message]);
  if (response.finish_reason === "tool_calls") {
    console.log("Needs tools");

    return await resolve_tools(
      response,
      default_model,
      getTools("general"),
      threadID,
      { signal, context, onAssistantMessage },
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
  { signal, context, onAssistantMessage }: {
    signal?: AbortSignal, context?: ContextType, onAssistantMessage?: (message: OpenAI.ChatCompletionAssistantMessageParam) => void
  } = {}
) {
  const thread = await getThread(threadId)!;
  const messages = thread!.messages;
  if (
    response.finish_reason === "tool_calls" &&
    response.message.tool_calls &&
    response.message.tool_calls.length
  ) {

    onAssistantMessage?.(response.message)

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
          const r = await runTool(tool, context);

          console.log("raw_res: ", r);
          tool_res = JSON.stringify(r);

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

        if (enable_fallback && !isInLimit(messages.concat(res), 16000)) {
          notifyChannel(`Context too long summerizing with gpt`);
          return {
            tool_call_id: res.tool_call_id,
            role: "tool",
            content: await minimizeUsingGpt3(res.content ?? ""),
          } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam;
        };

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
    await updateThread(threadId, [response.message]);

    if (
      response.finish_reason === "tool_calls" &&
      response.message.tool_calls &&
      response.message.tool_calls.length
    ) {
      console.log("resolving more tools: ", response.message);
      return resolve_tools(response, model, tools, threadId, { signal, context, onAssistantMessage });
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

async function minimizeUsingGpt3(text: string) {
  const res = await complete({
    model: large_context_model,
    messages: [
      {
        role: "system",
        content: 'Summarize the main points of the provided HTML page, retaining essential information. Output a concise summary with a "read more" link to the main site.'
      },
      {
        role: "user",
        content: text,
      },
    ]
  });

  return res.choices[0].message.content;
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
