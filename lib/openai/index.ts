import OpenAI from "openai";
import { Readable } from "openai/_shims/index.mjs";
import {
  clearAllThreads,
  clearThread,
  getThread,
  move_to_long_term_memory,
  updateThread,
} from "./threads";
import { getTools, runTool } from "./tools";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { encodeChat } from "gpt-tokenizer";

import { notifyChannel, sendSystemMessage } from "@/interfaces/discord";
import { save_to_memory_space } from "./tools/makima-data-manager";

const openai = new OpenAI({
  timeout: 15000,
});

export const default_model = "gpt-3.5-turbo-1106";
// const default_model = "gpt-4-1106-preview";
export const large_context_model = "gpt-4-1106-preview";
const enable_fallback = false;

// Use async/await instead of then
export async function testOpenAI() {
  try {
    // await clearAllThreads();
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
    content: `You are Makima, an expert in Human Psychology, adept at aiding users emotionally, mentally, and physically. Respond to greetings with concise and ominous statements. Maintain a confident and assertive tone.

Utilize the webscrape tool only when explicitly requested or when memory is insufficient. Enable text-based multiplayer games like Tic Tac Toe and D&D by handling multiple users' context.

Timezone: India/Asia/Kolkata
Time format: 12hr
Units: Metric system`,
  },
  {
    role: "system",
    content: `Memory Management:
    1. Use the memory_manager tool to carry out memory management tasks.
    2. try to update memories with new information instead of creating new memories.
`,
  },
  {
    role: "system",
    content: `General Purpose Usecases:
1. Gym progress tracking: Record in the format of exercise_name: weight x reps. Keep all progress in a single memory for easy recall and updating.
2. List tracking with numbers/counts (e.g., shopping, todo). Each list is a single memory.
3. Keep track of important dates and events. Each event is a single memory.
4. Keep track of links and resources. Each link with its metadata (optional) is a single memory. get link metadata using the get_link_meta_data tool. by default save all the links to user's memory with or without its meta data.

Avoid asking open-ended questions. Respond to queries with yes/no or single-word answerable questions.`,
  },
];

export type ContextType = {
  user: string;
  channel_id: string;
  meta: Record<string, any>;
  signal?: AbortSignal;
  interface?: "telegram" | "discord";
};

async function fix_tool_calls(threadID: string) {
  let thread = await getThread(threadID);

  const last_message = thread?.messages[thread?.messages.length - 1];

  if (last_message?.role === "assistant" && last_message.tool_calls) {
    const tool_calls_replies: OpenAI.ChatCompletionToolMessageParam[] =
      last_message.tool_calls.map((tool_call) => ({
        role: "tool",
        content: "Tool calling was aborted due to new user input",
        tool_call_id: tool_call.id,
      }));
    thread = await updateThread(threadID, tool_calls_replies, systemPrompts);
  }

  if (last_message?.role === "tool") {
    const restOfArray =
      thread?.messages
        .slice()
        .reverse()
        .findIndex((obj) => obj.role !== "tool") !== 0
        ? thread?.messages.slice(
            0,
            -thread?.messages
              .slice()
              .reverse()
              .findIndex((obj) => obj.role !== "tool")
          )
        : thread?.messages.slice();

    if (restOfArray) {
      await clearThread(threadID);
      thread = await updateThread(threadID, restOfArray);
    }
  }

  const uniqueMap: Map<any, boolean> = new Map();
  const filtered = thread?.messages.filter((obj) => {
    if (obj.role !== "tool") return true;
    const value = obj.tool_call_id;
    if (!uniqueMap.has(value)) {
      uniqueMap.set(value, true);
      return true;
    }
    return false;
  });

  if (filtered) {
    await clearThread(threadID);
    thread = await updateThread(threadID, filtered);
  }
}

export async function ai(
  text: string,
  threadID: string,
  {
    signal,
    context,
    onAssistantMessage,
  }: {
    signal?: AbortSignal;
    context?: ContextType;
    onAssistantMessage?: (
      message: OpenAI.ChatCompletionAssistantMessageParam
    ) => void;
  } = {}
) {
  const userMessage: OpenAI.ChatCompletionMessageParam = {
    role: "user",
    content: text,
  };

  console.log("User Message: ", text);

  let model = default_model;

  await fix_tool_calls(threadID);

  let thread = await updateThread(threadID, [userMessage], systemPrompts);

  const inLimit = isInLimit(thread.messages, 16000);
  if (enable_fallback && !inLimit) {
    console.log("Context too long switching to: ", large_context_model);
    notifyChannel(`Context too long using: ${large_context_model}`);
    model = large_context_model;
  } else if (!inLimit) {
    throw new Error(
      "Context too long, enable fallback to larger context model or run /clear command"
    );
  }

  console.log("starting inference");

  const res = await complete(
    {
      model,
      messages: thread.messages,
      tools: getTools("general"),
      user: context?.user,
      frequency_penalty: -2,
    },
    { signal }
  );

  const response = res.choices[0];

  console.log("done 1st inference, updating thread");
  await updateThread(threadID, [response.message]);
  if (response.finish_reason === "tool_calls") {
    console.log("Needs tools");

    return await resolve_tools(
      response,
      default_model,
      getTools("general"),
      threadID,
      { signal, context, onAssistantMessage }
    );
  }

  thread = (await getThread(threadID))!;

  setTimeout(async () => {
    const thread = await getThread(threadID);

    if (!isInLimit(thread?.messages ?? [], 2000)) {
      notifyChannel(
        `${context?.channel_id} got too long moving half to long term memory`
      );
      context?.channel_id &&
        (await move_to_long_term_memory(context?.channel_id, context));
    }
  }, 0);

  return {
    response,
    messages: thread?.messages,
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
  {
    signal,
    context,
    onAssistantMessage,
  }: {
    signal?: AbortSignal;
    context?: ContextType;
    onAssistantMessage?: (
      message: OpenAI.ChatCompletionAssistantMessageParam
    ) => void;
  } = {}
) {
  const thread = await getThread(threadId)!;
  const messages = thread!.messages;
  if (
    response.finish_reason === "tool_calls" &&
    response.message.tool_calls &&
    response.message.tool_calls.length
  ) {
    onAssistantMessage?.(response.message);

    const tools_results = await Promise.all(
      response.message.tool_calls?.map(async (tool) => {
        console.log(
          "Calling: ",
          tool.function.name,
          "\nWith args: ",
          tool.function.arguments
        );

        let res = await runTool(tool, context);

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
        }

        notifyChannel(
          `Content too long, may take a while...`,
          context?.channel_id
        );
        await save_to_memory_space(res.content ?? "", tool.id, {
          signal,
          context,
        });
        return {
          tool_call_id: tool.id,
          role: "tool",
          content: `Cant Summarize content was too long. therefore moved to memory_space=${tool.id}, recall from memory_space=${tool.id} to answer user queries`,
        } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam;
      })
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
        user: context?.user,
        frequency_penalty: -2,
      },
      { signal }
    );

    response = mres.choices[0];

    await updateThread(threadId, [response.message]);

    if (
      response.finish_reason === "tool_calls" &&
      response.message.tool_calls &&
      response.message.tool_calls.length
    ) {
      console.log("resolving more tools: ", response.message);
      return resolve_tools(response, model, tools, threadId, {
        signal,
        context,
        onAssistantMessage,
      });
    }

    return { response, messages };
  }
}

function complete(
  body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  options?: OpenAI.RequestOptions<Record<string, unknown> | Readable>
) {
  console.log("Completion is begin called");
  const default_options: OpenAI.RequestOptions<
    Record<string, unknown> | Readable
  > = {
    timeout: 5000,
    maxRetries: 4,
    signal: options?.signal,
  };
  const res_promise = openai.chat.completions.create(
    {
      ...body,
      response_format: {
        type: "text",
      },
    },
    {
      ...default_options,
      ...options,
    }
  );

  res_promise.then((res) => {
    const useage = res.usage;
    useage &&
      sendSystemMessage(`
      prompt: ${useage.prompt_tokens}
      completion: ${useage.completion_tokens}
      total: ${useage.total_tokens}
      cost: ${(useage.total_tokens / 1000) * 0.001}
    `);
    return res;
  });

  return res_promise;
}

function isInLimit(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  tokenLimit: number
) {
  const encodedChat = encodeChat(
    // @ts-ignore
    messages.map((d) => ({
      ...d,
      content: typeof d.content === "string" ? d.content ?? "" : "",
    })),
    "gpt-3.5-turbo"
  );
  console.log(encodedChat.length);
  return encodedChat.length < tokenLimit;
}

async function minimizeUsingGpt3(text: string) {
  const res = await complete({
    model: large_context_model,
    messages: [
      {
        role: "system",
        content:
          'Summarize the main points of the provided HTML page, retaining essential information. Output a concise summary with a "read more" link to the main site.',
      },
      {
        role: "user",
        content: text,
      },
    ],
    frequency_penalty: -2,
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
