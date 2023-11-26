import OpenAI from "openai";
import { createCalculator, createClock } from "openai-function-calling-tools";
import { shell } from "./shell";
// import { forget_discord_conversation } from "./forget_discord_conversation";
import { schedule_task } from "./scheduled_task";
// import { setBotPresence } from "./discord_presence";
import { ContextType } from "..";
import {
  delete_all_user_memories,
  forget_user_memory,
  get_user_context,
  recall_user_memory,
  save_user_memory,
  update_user_memory,
} from "./user-data-manager";
import {
  forget_makima_memory,
  forget_memory_space,
  recall_makima_memory,
  save_makima_memory,
} from "./makima-data-manager";
import { get_youtube_video_data } from "./webtools/youtube";
import { webscrape } from "./webtools/scrape";
import { encodeChat } from "gpt-tokenizer";
import { $ } from "zx";
import { memory_manager, message_user } from "./memory_agent";

const [clock, clockSchema] = createClock();
const [calculator, calculatorSchema] = createCalculator();

export const tools_map: Record<string, (p: any, context?: ContextType) => any> =
  {
    schedule_task,
    clock,
    calculator,

    shell,

    get_user_context,

    save_user_memory,
    recall_user_memory,
    forget_user_memory,
    update_user_memory,
    delete_all_user_memories,

    message_user,

    save_makima_memory,
    recall_makima_memory,
    forget_makima_memory,
    forget_memory_space,

    get_youtube_video_data,
    webscrape,

    // agents
    memory_manager,
  };

export const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_user_context",
      description: "Get the user's or the message's context and details",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: clockSchema as OpenAI.FunctionDefinition,
  },
  {
    type: "function",
    function: calculatorSchema as OpenAI.FunctionDefinition,
  },
  {
    type: "function",
    function: {
      name: "shell",
      description: `
      Use for:
        - Running shell commands.

      Additional uses:
        - Automated server maintenance.
        - Collecting system logs and metrics.
        - Fetching real-time data.
        - Use the 'tree' command to get a directory tree.
        - Use git grep when searching for a string in a git repo.

      Limitations:
        - Limited user interaction support.
        - Security risk if used improperly. (Prompt user for sudo password)
        - Permissions restricted by user.
        - Stateless - session ends after execution.
    `,
      parameters: {
        type: "object",
        properties: {
          commandString: {
            type: "string",
            description: "The command to run",
          },
        },
        required: ["commandString"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_presence",
      description: "Can be used to set the bot's presence",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "discord message's channel_id",
          },
        },
        required: ["status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_task",
      description: `Schedule tasks with user instructions and specific times. 'Reply:' sends responses, 'Run:' executes commands with output. AI processes instructions at set times, promptly returning results. Clearly communicate user intentions for precise AI execution. This AI handles tasks similarly to you. When the user asks for a future action, instruct the AI to execute it at the specified time and reply with the result.
Examples:

1. user: \`Remind me to drink water in 1 hour\`
   task: { instruction: "Reply: 'Drink water, it's time up'", time: "2023-11-21T17:30:00" }

2. user: \`Check system uptime at 4:30 PM\`
   task: { instruction: "Run 'uptime' and reply with the result", time: "2023-11-21T16:30:00" }

3. user: \`Check if example.com is online after 10 minutes\`
   task: { instruction: "Run 'curl' to example.com and reply if online", time: "2023-11-21T15:05:00" }

4. user: \`Remind <@user_id> to submit the report at 3 PM\`
   task: { instruction: "Reply: '<@user_id> You submit the report'", time: "2023-11-21T15:00:00" }
`,
      parameters: {
        type: "object",
        properties: {
          instruction: {
            type: "string",
            description: "The instruction to the AI for the scheduled task",
          },
          time: {
            type: "string",
            format: "iso-time",
            description: "The ISO time string for scheduling the task",
          },
        },
        required: ["instruction", "time"],
      },
    },
  },
  // memory tools
  {
    type: "function",
    function: {
      name: "memory_manager",
      description: `Manage memories.
      Examples:
      1. user: "Remember my gym stats. Bench press 60kg 9 reps, Bicep curls 15kg 10reps, Pull ups 3 reps"
          makima_prompt: 'save gym stats, bench press 60kg 9 reps, bicep curls 15kg 10reps, pull ups 3 reps'
      2. user: "Update my pull ups to 5 reps"
          makima_prompt: 'update pull ups to 5 reps context: gym'
      3. user: "How many eggs do I need to buy?"
          makima_prompt: 'recall shopping list'
      4. user: "Remember my name is raj"
          makima_prompt: 'save user's name as raj'
      5. user: "Whats my name"
          makima_prompt: 'recall user's name'
      5. needs old message with id of search_id: "somevalue"
          makima_prompt: 'find the old message of search_id: "somevalue"'
      6. you need to search for "test term" in a memory_sapce of "tools_id_1321431412"
          makima_prompt: 'search test term in tools_id_1321431412 memory_space'
      `,
      parameters: {
        type: "object",
        properties: {
          makima_prompt: {
            type: "string",
            description: "The prompt to use for memory_manager",
          },
        },
        required: ["makima_prompt"],
      },
    },
  },

  // web tools
  {
    type: "function",
    function: {
      name: "get_youtube_video_data",
      description: `Get data about a youtube video. its transcript and other metadata.`,
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The youtube url",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "webscrape",
      description: `Web scrape a website and return the text content.`,
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The website url",
          },
        },
        required: ["url"],
      },
    },
  },
];

// export const auto_tools
type Context = "general" | "discord";
export function getTools(context: Context) {
  switch (context) {
    case "general":
      return tools;
    case "discord":
      return tools;
  }
}

export async function runTool(
  tool: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
  context?: ContextType
): Promise<OpenAI.Chat.Completions.ChatCompletionToolMessageParam> {
  let validated_args;
  try {
    validated_args = JSON.parse(tool.function.arguments);
  } catch {
    return {
      role: "tool",
      tool_call_id: tool.id,
      content: "Invalid JSON passed as arguments",
    } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam;
  }
  if (tool.function.name === "switch_tool_set") {
    return validated_args.context;
  }

  try {
    let tool_res = await tools_map[tool.function.name](validated_args, context);
    console.log("raw_res: ", tool_res);
    tool_res = JSON.stringify(tool_res);

    const res: OpenAI.Chat.Completions.ChatCompletionToolMessageParam = {
      tool_call_id: tool.id,
      role: "tool",
      content: minimizeString(tool_res),
    };
    return res;
  } catch (error) {
    return {
      role: "tool",
      tool_call_id: tool.id,
      content: minimizeString(JSON.stringify(error)),
    } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam;
  }
}

export function isInLimit(
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
  return encodedChat.length < tokenLimit;
}

function minimizeString(inputString: string): string {
  return minimizeTokens(inputString);
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
