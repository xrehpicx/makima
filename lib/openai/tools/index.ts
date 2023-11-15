import OpenAI from "openai";
import * as math from "mathjs";
import { scheduleBotMessage, setBotPresence } from "../../..";
import { ActivityType } from "discord.js";
import { createClock, createWebBrowser, createRequest } from "openai-function-calling-tools";


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

const [clock, clockSchema] = createClock()
const [webbrowser, webBrowserSchema] = createWebBrowser()
const [request, requestSchema] = createRequest()



export const functions: Record<string, (...args: any[]) => any> = {
  set_presence: setBotPresence,
  schedule_message: scheduleBotMessage,
  clock,
  webbrowser,
  request
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
      description: "Schedule a message to be sent when user asks to do so, do not use this to spam users, use this to send a message to a user after a certain amount of time",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description:
              "The message to send, tag the user with <@user_id> when the user asks",
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
    function: requestSchema as OpenAI.FunctionDefinition
  },

];
