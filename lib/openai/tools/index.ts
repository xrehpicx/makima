import OpenAI from "openai";
import { createCalculator, createClock, createRequest, createWebBrowser } from "openai-function-calling-tools";
import { shell } from "./shell";
import { forget_discord_conversation } from "./forget_discord_conversation";
import { schedule_task } from "./scheduled_task";
import { setBotPresence } from "./discord_presence";
import { ContextType } from "..";

const [clock, clockSchema] = createClock();
const [webbrowser, webBrowserSchema] = createWebBrowser();
const [calculator, calculatorSchema] = createCalculator();
const [request, requestSchema] = createRequest();

export const tools_map: Record<string, (p: any, context?: ContextType) => any> = {
  schedule_task,
  clock,
  calculator,
  webbrowser,
  shell,
  forget_discord_conversation,
  set_presence: setBotPresence,
  request
};

export const tools: OpenAI.ChatCompletionTool[] = [
  {
    "type": "function",
    "function": {
      "name": "schedule_task",
      "description": `Schedule a task by telling it what to message the user at the required time. 
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
      "parameters": {
        "type": "object",
        "properties": {
          "instruction": {
            "type": "string",
            "description": "The instruction to the AI for the scheduled task"
          },
          "time": {
            "type": "string",
            "format": "iso-time",
            "description": "The ISO time string for scheduling the task"
          }
        },
        "required": ["instruction", "time"]
      }
    }
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
      `
    } as OpenAI.FunctionDefinition,
  },
  // {
  //   type: "function",
  //   function: webBrowserSchema as OpenAI.FunctionDefinition,
  // },
  {
    type: "function",
    function: {
      name: "shell",
      description: `
      Use for:
        - Running shell commands.
        - Headless browsers for web automation.
        - Storing/retrieving user notes.

      Examples:
        - List files: { "commandString": "ls" }
        - Get system info: { "commandString": "uname -a" }
        - Run Python script: { "commandString": "python3 script.py" }
        - Open website with headless browser: { "commandString": "npx puppeteer-cli https://www.example.com" }

      Additional uses:
        - Automated server maintenance.
        - Collecting system logs and metrics.
        - Fetching real-time data.

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
  // {
  //   type: "function",
  //   function: requestSchema as OpenAI.FunctionDefinition,
  // },

  // discord tools
  //   {
  //     type: "function",
  //     function: {
  //       name: "set_presence",
  //       description: `Can be used to set discord bot presence.
  // example:
  // user: set presence to playing with your mind
  // set_presence: message: "with your mind", type: 0
  // example 2:
  // user: set presence to watching you
  // set_presence: message: "you", type: 3
  //       `,
  //       parameters: {
  //         type: "object",
  //         properties: {
  //           message: {
  //             type: "string",
  //             description: "The message to set as presence",
  //           },
  //           type: {
  //             type: "number",
  //             description:
  //               "The type of the presence  Playing = 0, Streaming = 1, Listening = 2, Watching = 3, Competing = 5",
  //           },
  //         },
  //         required: ["message", "type"],
  //       },
  //     },
  //   },
  // {
  //   type: "function",
  //   function: {
  //     name: "forget_discord_conversation",
  //     description: "Can be used to forget ongoing discord conversation",
  //     parameters: {
  //       type: "object",
  //       properties: {
  //         channel_id: {
  //           type: "string",
  //           description: "discord message's channel_id",
  //         },
  //       },
  //       required: ["channel_id"],
  //     },
  //   },
  // },
  //   {
  //     type: "function",
  //     function: {
  //       name: "switch_tool_set",
  //       description: `Based on user conversation switch contexts from the below list:
  // context_list:
  //   - 'discord' # switch to this context when any discord conversation related request is made`,
  //       parameters: {
  //         type: "object",
  //         properties: {
  //           context: {
  //             type: "string",
  //             description: "the context to get functions of",
  //           },
  //         },
  //         required: ["context"],
  //       },
  //     },
  //   },
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

export function runTool(
  tool: OpenAI.Chat.Completions.ChatCompletionMessageToolCall, context?: ContextType
) {
  let validated_args;
  try {
    validated_args = JSON.parse(tool.function.arguments);
  } catch {
    return "function argument was invalid JSON";
  }
  if (tool.function.name === "switch_tool_set") {
    return validated_args.context;
  }
  return tools_map[tool.function.name](validated_args, context);
}
