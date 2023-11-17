import OpenAI from "openai";
import { notifyAdmins, notifyChannel, scheduleBotMessage, setBotPresence } from "../../..";
import { ActivityType } from "discord.js";
import { createClock, createWebBrowser, createRequest } from "openai-function-calling-tools";
import { ask, forget_chat } from "..";
import { $ } from "zx";

// function calculator({ expression }: { expression: string }) {
//   const res = String(math.evaluate(expression));
//   console.log(expression, res);
//   return res
// }

// function get_date_time() {
//   return `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
// }

// function to execute javascript in a child process and return the stdout or stderr
// function runUbuntuCommand({ code }: { code: string }) {
//   const { exec } = require("child_process");
//   return new Promise<string>((resolve, reject) => {
//     exec(code, (error: any, stdout: any, stderr: any) => {
//       if (error) {
//         console.log(`error: ${error.message}`);
//         reject(error.message)
//       }
//       if (stderr) {
//         console.log(`stderr: ${stderr}`);
//         reject(stderr)
//       }
//       console.log(`stdout: ${stdout}`);
//       resolve(stdout)
//     });
//   })

// }

// shell function
async function shell({ commandString, delay, channel_id }: { commandString: string, delay?: number, channel_id: string }) {

  if (delay) {
    setTimeout(async () => {
      try {
        notifyChannel(`Running scheduled command: ${commandString}`)
        const res = await $`sh -c ${commandString}`
        notifyChannel(`Shell command output: ${res.stdout.toString()}`)
        await ask(`tell me about the scheduled shell command output of ${commandString}: ${res.stdout.toString() || "No output but ran successfully"}`, channel_id)
        // return res.stdout.toString()
      } catch (e: any) {
        notifyChannel(`Shell command output: ${e.stderr.toString()}`)
        await ask(`tell me about the Scheduled shell command e output of ${commandString}: error=${e.stderr.toString() || "No error message but command failed"}`, channel_id)
        // return e.stderr.toString()
      }
    }, delay)
    return `Done, Successfully setup to run after ${delay} milliseconds, Reply to the user that the command was Successfully scheduled to run after ${delay} milliseconds`
  }

  try {
    notifyChannel(`Running shell command: ${commandString}`)
    const res = await $`sh -c ${commandString}`
    notifyChannel(`Shell command output: ${res.stdout.toString()}`)
    return res.stdout.toString() || "Command ran successfully"
  } catch (e: any) {
    return e.stderr.toString() || "Command failed to run"
  }
}

async function self_reminder({ action_description, time, channel_id }: { action_description: string, time: number, channel_id: string }) {
  const timeout = setTimeout(async () => {
    const res = await ask(action_description, channel_id)
    notifyChannel(res?.content ?? "whatever u told to run ran", channel_id)
  }, time)
  return `Action will run after ${time} milliseconds, DO NOT RUN THIS COMMAND AGAIN`
}



const [clock, clockSchema] = createClock()
const [webbrowser, webBrowserSchema] = createWebBrowser()
const [request, requestSchema] = createRequest()



export const functions: Record<string, (...args: any[]) => any> = {
  set_presence: setBotPresence,
  schedule_message: scheduleBotMessage,
  clock,
  webbrowser,
  request,
  forget_chat,
  shell,
  self_reminder
};


export const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "set_presence",
      description: "Set the bot presence",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description:
              "The message to show as the bot presence excluding the type string",
          },
          type: {
            type: "number",
            enum: Array.from(Object.values(ActivityType)).filter(v => typeof v === "number"),
            description:
              "The type of the presence  Playing = 0, Streaming = 1, Listening = 2, Watching = 3, Competing = 5",
          },
        },
        required: ["message", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_message",
      description: "Used to schedule messages to be sent in the future, use ONLY when requested by the user",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description:
              "The message to send, tag the user with <@user_id> if the user asks",
          },
          time: {
            type: "number",
            description:
              "The time in milliseconds to wait before sending the message",
          },
          channelId: {
            type: "string",
            description:
              "The id of the channel to send the message in",
          },
        },
        required: ["message", "time", "channelId"],
      },
    },
  },
  {
    type: "function",
    function: clockSchema as OpenAI.FunctionDefinition
  },
  {
    type: "function",
    function: {
      ...webBrowserSchema,
      description: "Open a web browser and return the html of the page, use this only when absolutely needed, do not use this to scrape file links or gif links, use the request function for that",
    } as OpenAI.FunctionDefinition
  },
  {
    type: "function",
    function: {
      name: "forget_chat",
      description: "Forget the chat history of the current channel, use this when the bot is stuck in a loop",
      parameters: {
        type: "object",
        properties: {
          channelId: {
            type: "string",
            description:
              "The id of the channel to forget",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "shell",
      description: "Run or Schedule a shell command and inform the user that the command was scheduled or return the output only if delay was 0 NEVER use schedule_message immediately after or before this. example: check uptime in 5mins: shell {commandString: uptime, delay: 300000, channel_id: <channel_id>}, run a command immediately: shell {commandString: uptime, delay: 300000, channel_id: <channel_id>}",
      parameters: {
        type: "object",
        properties: {
          commandString: {
            type: "string",
            description:
              "The command to run",
          },
          delay: {
            type: "number",
            description:
              "Delay the execution of the command by this many milliseconds, can be used to schedule a command to run in the future, select 0 to run immediately",
          },
          channel_id: {
            type: "string",
            description:
              "The id of the channel to send the output to after the delay",
          },
        },
        required: ["commandString", "delay", "channel_id"],
      },
    },
  }
];
