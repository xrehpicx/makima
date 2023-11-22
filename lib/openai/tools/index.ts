import OpenAI from "openai";
import { createCalculator, createClock } from "openai-function-calling-tools";
import { shell, tmux_shell } from "./shell";
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
import { NodeHtmlMarkdown } from "node-html-markdown";

const [clock, clockSchema] = createClock();
// const [webbrowser, webBrowserSchema] = createWebBrowser();
const [calculator, calculatorSchema] = createCalculator();
// const [request, requestSchema] = createRequest();

export const tools_map: Record<string, (p: any, context?: ContextType) => any> =
  {
    schedule_task,
    clock,
    calculator,

    shell,
    // forget_discord_conversation,
    // set_presence: setBotPresence,

    get_user_context,
    tmux_shell,

    save_user_memory,
    recall_user_memory,
    forget_user_memory,
    delete_all_user_memories,

    save_makima_memory,
    recall_makima_memory,
    forget_makima_memory,
    forget_memory_space,

    get_youtube_video_data,
    webscrape,
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
    function: {
      name: "schedule_task",
      description: `Schedule a task by telling it what to message the user at the required time. 
      Always check the time before running the task.
      'Reply with' is a special instruction that will reply to the user with the given message use this for all reminder use cases!.
      Example 1:
      user: \`Remind me to drink water in 1 hour\`
      task: { instruction: "Reply with 'Drink water, it's time up'", time: "2023-11-21T17:30:00" }

      Example 2:
      user: \`Check system uptime at 4:30 PM\`
      task: { instruction: "Run 'uptime' command and reply with the result", time: "2023-11-21T16:30:00" }

      Example 3:
      user: \`Check if example.com is online after 10 minutes\`
      task: { instruction: "Make a 'curl' call to example.com and reply if it's online or not", time: "2023-11-21T15:05:00" }

      Example 4:
      user: \`Remind me to submit the report at 3 PM\`
      task: { instruction: "Reply with 'You need to submit the report right now!'", time: "2023-11-21T15:00:00" }
      
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

  {
    type: "function",
    function: clockSchema as OpenAI.FunctionDefinition,
  },
  {
    type: "function",
    function: {
      ...calculatorSchema,
      description: `
      Use for:
        - Calculating simple math expressions.
        - Converting between units.
        - Calculating time differences.
        - Calculating time in different timezones.
      `,
    } as OpenAI.FunctionDefinition,
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

  // memory tools
  {
    type: "function",
    function: {
      name: "save_user_memory",
      description: `Save user preferences or documents for future reference.

Example:
- save_user_memory({ content: "user likes color blue" })`,
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content to save",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recall_user_memory",
      description: `Recall a user's preference or information from past conversations. Useful for retrieving remembered details such as user preferences and documented requests.
Example:
- User: "What color do I like?"
- recall_memory({ term: "user likes color" })`,
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content to recall",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "forget_user_memory",
      description: "Can be used to forget a memory",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content to forget",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_all_user_memories",
      description: "Can be used to delete all user memories at once",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  // the bots own memory
  {
    type: "function",
    function: {
      name: "save_makima_memory",
      description: `Save memories about general topics and knowledge for your own reference. This is your personal memory, use it to remember things that you find interesting or useful.

When to use:
- Example 1: Your favorite color is red.
- Example 2: You learned that the capital of France is Paris.
- Example 3: A coding shortcut or command that you frequently use.
- Example 4: A fun fact about space that you want to remember.

Use this function whenever you come across information that you'd like to store for future reference.
You can also save memories to custom memory_spaces.`,
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content to save",
          },
          memory_space: {
            type: "string",
            description: "the memory_space to save the memory to.",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recall_makima_memory",
      description: `Recall a memory from your own memory (Makima's memory).
      Use this function to retrieve information you saved for future reference.
      You can also use this to fetch memories from custom memory_spaces.
      memory_spaces are scopes of memories isolated from the rest of your memories.
      `,
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content to recall",
          },
          memory_space: {
            type: "string",
            description: "The memory_space to recall from",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "forget_makima_memory",
      description: `Forget a memory from your own memory (Makima's memory). Use this function to remove information that you no longer need or find relevant.`,
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content to forget",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "forget_memory_space",
      description: `Forget an entire memory_space`,
      parameters: {
        type: "object",
        properties: {
          memory_space: {
            type: "string",
            description: "The memory_space to forget",
          },
        },
        required: ["memory_space"],
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

const discord_tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "forget_discord_conversation",
      description: "Can be used to forget ongoing discord conversation",
      parameters: {
        type: "object",
        properties: {
          channel_id: {
            type: "string",
            description: "discord message's channel_id",
          },
        },
        required: ["channel_id"],
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
      return tools.concat(discord_tools);
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
