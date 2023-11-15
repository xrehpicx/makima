import OpenAI from "openai";
import * as math from "mathjs";
import { scheduleBotMessage, setBotPresence } from "../../..";
import { ActivityType } from "discord.js";


function calculator({ expression }: { expression: string }) {
  const res = String(math.evaluate(expression));
  console.log(expression, res);
  return res
}

function get_date_time() {
  return new Date().toLocaleString();
}


export const functions: Record<string, typeof calculator | typeof get_date_time | typeof setBotPresence | typeof scheduleBotMessage> = {
  calculator,
  get_date_time,
  set_presence: setBotPresence,
  schedule_message: scheduleBotMessage
};



export const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "calculator",
      description: "Calculate a math expression",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description:
              "The math expression that you want to calculate",
          },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_date_time",
      description: "Get the current date and time",
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
      description: "Schedule a message to be sent",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description:
              "The message to send, tag the user with <@user_id> everytime",
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
  }
];
