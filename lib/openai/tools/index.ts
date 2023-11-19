import OpenAI from "openai";
import { createClock, createWebBrowser } from "openai-function-calling-tools";
import { shell } from "./shell";
import { forget_discord_conversation } from "./forget_discord_conversation";

const [clock, clockSchema] = createClock();
const [webbrowser, webBrowserSchema] = createWebBrowser();

export const tools_map: Record<string, (p: any) => any> = {
  clock,
  webbrowser,
  shell,
  forget_discord_conversation,
};

export const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: clockSchema as OpenAI.FunctionDefinition,
  },
  {
    type: "function",
    function: {
      ...webBrowserSchema,
      // description:
      //   "Open a web browser and return the html of the page, use this only when absolutely needed, do not use this to scrape file links or gif links, use the request function for that",
    } as OpenAI.FunctionDefinition,
  },
  {
    type: "function",
    function: {
      name: "shell",
      description:
        "Run one off shell commands, with no state saved between commands, use tmux session to run commands with state",
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

  // discord tools
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
  tool: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
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
  return tools_map[tool.function.name](validated_args);
}
