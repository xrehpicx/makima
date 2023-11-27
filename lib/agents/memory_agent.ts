import { notifyChannel, sendSystemMessage } from "@/interfaces/discord";
import OpenAI from "openai";
import { Readable } from "openai/_shims/index.mjs";
import { ContextType } from "../openai";
import { isInLimit, runTool } from "../openai/tools";
import { save_to_memory_space } from "../openai/tools/makima-data-manager";
import { notify_telegram_channel } from "@/interfaces/telegram";

const agent_tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "save_user_memory",
      description: `Used to save a memory about a user.
      Use only when explicitly asked to do so or there are no similar memories to append to.
      `,
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content to save",
          },
          context: {
            type: "string",
            description:
              "The type or category of memory (e.g., gym, entertainment)",
          },
        },
        required: ["content", "context"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recall_user_memory",
      description: `search a memory about a user and get its memory_id and content.
      Increase the count to fetch more memories and search deeper.
      Examples:
      1. user: "what color does user like"
        recall_user_memory({ content: "liked color context: color" })
      2. user: "what are user's gym stats"
        recall_user_memory({ content: "gym stats context: gym" })
      3. user: "what is user's favorite movie"
        recall_user_memory({ content: "favorite movie context: entertainment" })
      4. user: "find the old message of search_id: 'somevalue'"
        recall_user_memory({ content: "search_id: 'somevalue'" })
`,
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content search by to recall",
          },
          count: {
            type: "string",
            description: "Number of memories to recall max value is 10",
          },
        },
        required: ["content", "count"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "update_user_memory",
      description: `Update a memory about a user.
      Try to Append to existing memories instead of replacing them when possible.
      `,
      parameters: {
        type: "object",
        properties: {
          memory_id: {
            type: "string",
            description: "The id of the memory to update",
          },
          updated_content: {
            type: "string",
            description:
              "The updated content string to replace the old, along with the context and timestamp",
          },
          context: {
            type: "string",
            description:
              "The type or category of memory (e.g., gym, entertainment)",
          },
        },
        required: ["memory_id", "updated_content", "context"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "forget_user_memory",
      description: `Forget a memory about a user. Use only when explicitly asked to do so. Make sure to recall to get memory_id before forgetting it.
      If user asks to forget more than one memory ask for confirmation before forgetting.`,
      parameters: {
        type: "object",
        properties: {
          memory_id: {
            type: "string",
            description: "The id of the memory to forget",
          },
        },
        required: ["memory_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "message_user",
      description: `Can send a message to the user directly.
      Use this only if makima asked to recall something.
      Do not use message_user to notify the user that you have saved a memory, makima will do that for you.
      if the content is a list of things or gym stats, format it as a markdown list or table
      `,
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: `The content to send to the user.`,
          },
        },
        required: ["content"],
      },
    },
  },
];

const agent_prompt = `As an AI memory assistant for Makima, your primary focus is on managing user memories. 
Try to always APPEND to or UPDATE existing memories even if user says 'save'.
Examples:
1. user says "user likes blue" and then says "user likes red" you should update the existing memory instead of creating a new one. 
2. if you have a memory "user's gym stats are 100kg bench press, 50kg squat, 60kg deadlift" and user says they can do 4 pull-ups, you should append it to the existing memory as: "user's gym stats are 100kg bench press, 50kg squat, 60kg deadlift, 4 pull-ups" instead of creating a new memory.

when makima asks to recall something use message_user to directly send the memory to the user.
Do not use message_user to notify the user that you have saved a memory, makima will do that for you.

When faced with complex tasks, request simplification from Makima. Always return relevant information to user and seek confirmation when necessary.
Avoid creating custom memory spaces unless explicitly instructed.
`;

const openai = new OpenAI({
  timeout: 15000,
});

const default_model = "gpt-3.5-turbo-1106";

function complete(
  body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  options?: OpenAI.RequestOptions<Record<string, unknown> | Readable>
) {
  console.log("Memory agent called");
  const default_options: OpenAI.RequestOptions<
    Record<string, unknown> | Readable
  > = {
    timeout: 15000,
    maxRetries: 4,
    signal: options?.signal,
  };
  const res_promise = openai.chat.completions.create(
    {
      ...body,
      temperature: 0,
      response_format: { type: "text" },
      top_p: 0.1,
      frequency_penalty: 0.6,
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
      Memory Agent
      prompt: ${useage.prompt_tokens}
      completion: ${useage.completion_tokens}
      total: ${useage.total_tokens}
      cost: ${(useage.total_tokens / 1000) * 0.001}
    `);
    return res;
  });

  return res_promise;
}

export async function message_user(
  { content }: { content: string },
  context?: ContextType
) {
  switch (context?.interface) {
    case "discord":
      notifyChannel(`${content}\n- mem agent`, context.channel_id);
      break;
    case "telegram":
      notify_telegram_channel(`${content}\n- mem agent`, context.channel_id);
      break;
    default:
      break;
  }
  return "Memory was sent to user already, do not send the data back yourself, just reply with 'memory was sent to user, reply with done'";
}

export async function memory_manager(
  { makima_prompt }: { makima_prompt: string },
  context?: ContextType
) {
  const prompts: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: agent_prompt,
    },
    {
      role: "user",
      content: makima_prompt,
    },
  ];

  const model = default_model;

  const res = await complete(
    {
      model,
      messages: prompts,
      tools: agent_tools,
    },
    { signal: context?.signal }
  );

  let response = res.choices[0];
  let messages = prompts.concat(response.message);

  if (
    response.finish_reason === "tool_calls" &&
    response.message.tool_calls &&
    response.message.tool_calls.length
  ) {
    // console.log("resolving more tools: ", response.message);
    const res_tools = await resolve_tools(
      response,
      model,
      agent_tools,
      messages,
      { signal: context?.signal, context }
    );
    response = res_tools?.response!;
    messages = res_tools?.messages!;
  }
  return response.message.content;
}

async function resolve_tools(
  response: OpenAI.Chat.Completions.ChatCompletion.Choice,
  model: string,
  tools: OpenAI.Chat.Completions.ChatCompletionTool[],
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  {
    signal,
    context,
  }: {
    signal?: AbortSignal;
    context?: ContextType;
  } = {}
) {
  if (
    response.finish_reason === "tool_calls" &&
    response.message.tool_calls &&
    response.message.tool_calls.length
  ) {
    const tools_results = await Promise.allSettled(
      response.message.tool_calls?.map(async (tool) => {
        console.log(
          "Calling: ",
          tool.function.name,
          "\nWith args: ",
          tool.function.arguments
        );

        let res = await runTool(tool, context);
        console.log("why is this here?::: ", res);

        if (isInLimit(messages.concat(res), 16000)) {
          return res;
        }

        // if (enable_fallback && !isInLimit(messages.concat(res), 16000)) {
        //   notifyChannel(`Context too long summerizing with gpt`);
        //   return {
        //     tool_call_id: res.tool_call_id,
        //     role: "tool",
        //     content: await minimizeUsingGpt3(res.content ?? ""),
        //   } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam;
        // }

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

    messages = messages.concat(
      tools_results
        .filter((r) => {
          console.log(r);
          return r.status === "fulfilled";
        })
        .map(
          (r) =>
            (r.status === "fulfilled"
              ? (r.value as OpenAI.Chat.Completions.ChatCompletionMessageParam)
              : undefined)!
        )
    );

    // if (enable_fallback && !isInLimit(updatedThread.messages, 16000)) {
    //   console.log("Context too long switching to: ", large_context_model);
    //   notifyChannel(`Context too long using: ${large_context_model}`);
    //   model = large_context_model;
    // }

    const mres = await complete(
      {
        model,
        tools,
        messages,
        user: context?.user,
        frequency_penalty: -2,
      },
      { signal }
    );

    response = mres.choices[0];

    messages = messages.concat(response.message);

    if (
      response.finish_reason === "tool_calls" &&
      response.message.tool_calls &&
      response.message.tool_calls.length
    ) {
      console.log("resolving more tools: ", response.message);
      return resolve_tools(response, model, tools, messages, {
        signal,
        context,
      });
    }

    return { response, messages };
  }
}
