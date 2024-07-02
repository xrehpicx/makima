import { getAssistant } from "../../db/assistants";
import {
  createMessage,
  deleteMessage,
  getMessages,
  getThread,
  updateUsage,
} from "../../db/threads";
import OpenAI from "openai";
import { toolsRegistry } from "../tools";

const openai = new OpenAI();

export async function runThread(
  {
    threadId,
    assistantId,
  }: {
    threadId: number;
    assistantId: number;
  },
  automode?: boolean
) {
  const thread = await getThread(threadId);
  if (!thread) {
    throw new Error("Thread not found");
  }

  const messages = await getMessages({ threadId });
  const assistantRes = await getAssistant(assistantId);

  if (!assistantRes || assistantRes.length <= 0) {
    throw new Error("Assistant not found");
  }

  if (!assistantRes[0].enabled) {
    throw new Error("Assistant is disabled");
  }

  const assistant = assistantRes[0];

  const systemMessages: OpenAI.ChatCompletionSystemMessageParam[] = [
    {
      role: "system",
      content: `Your name is: ${assistant.name}
      
      ${assistant.prompt}
      `,
    },
  ];

  const formattedMessages: OpenAI.ChatCompletionMessageParam[] = messages.map(
    (message) => {
      return {
        ...message,
        threadId: undefined,
        id: undefined,
        createdAt: undefined,
      } as any;
    }
  );

  const finalMessages = [...systemMessages, ...formattedMessages];

  // needs to be of type of the params of the function createMessage
  const messagesToCreate: Parameters<typeof createMessage>[0][] = [];

  const runner = openai.beta.chat.completions
    .runTools({
      model: assistant.model ?? "gpt-4o",
      messages: finalMessages,
      tools: toolsRegistry,
    })
    .on("chatCompletion", async (completion) => {
      const message = completion.choices[0].message;

      const calledTools = message.role === "assistant" && message.tool_calls;

      messagesToCreate.push({
        content: Array.isArray(message.content)
          ? JSON.stringify(message.content)
          : message.content,
        role: message.role,
        threadId,
        tool_calls: calledTools ? JSON.stringify(calledTools) : undefined,
      });
    })
    .on("message", async (message) => {
      const isToolMessage = message.role === "tool";
      if (!isToolMessage) {
        return;
      }
      const existingCall = finalMessages.find(
        (m) => m.role === "tool" && m.tool_call_id === message.tool_call_id
      );
      if (existingCall) {
        return;
      }

      messagesToCreate.push({
        content: Array.isArray(message.content)
          ? JSON.stringify(message.content)
          : message.content,
        role: message.role,
        threadId,
        tool_call_id: message.tool_call_id,
      });
    })
    .on("totalUsage", async (usage) => {
      console.log("Total usage", usage);
      await updateUsage(threadId, usage);
    });

  try {
    const result = await runner.finalContent();
    for (const message of messagesToCreate) {
      await createMessage(message);
    }
    return result;
  } catch (error) {
    // delete last user message from thread
    if (automode) {
      await deleteMessage(messages[messages.length - 1].id);
    }
    console.error(error);
    throw new Error(
      "Error running thread, thread state restored to before run"
    );
  }
}
