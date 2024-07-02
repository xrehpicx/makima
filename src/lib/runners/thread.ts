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

async function validateEntities(threadId: number, assistantId: number) {
  const thread = await getThread(threadId);
  if (!thread) {
    throw new Error("Thread not found");
  }

  const assistantRes = await getAssistant(assistantId);
  if (!assistantRes || assistantRes.length <= 0) {
    throw new Error("Assistant not found");
  }

  const assistant = assistantRes[0];
  if (!assistant.enabled) {
    throw new Error("Assistant is disabled");
  }

  return { thread, assistant };
}

function processMessages(
  messages: Awaited<ReturnType<typeof getMessages>>,
  assistant: Awaited<ReturnType<typeof getAssistant>>[0]
) {
  const systemMessage = {
    role: "system",
    content: `Your name is: ${assistant.name}
    
    ${assistant.prompt}
    `,
  };

  const formattedMessages: OpenAI.ChatCompletionMessageParam[] = messages.map(
    (message) =>
      ({
        ...message,
        threadId: undefined,
        id: undefined,
        createdAt: undefined,
      } as unknown as OpenAI.ChatCompletionMessageParam)
  );

  return [
    systemMessage,
    ...formattedMessages,
  ] as OpenAI.ChatCompletionMessageParam[];
}

async function runToolsAndHandleResponses(
  threadId: number,
  messages: OpenAI.ChatCompletionMessageParam[],
  model: string
) {
  const messagesToCreate: Parameters<typeof createMessage>[0][] = [];
  const runner = openai.beta.chat.completions
    .runTools({
      model,
      messages,
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
      const existingCall = messages.find(
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
      await updateUsage(threadId, usage);
    });

  return { runner, messagesToCreate };
}

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
  const { thread, assistant } = await validateEntities(threadId, assistantId);
  const messages = await getMessages({ threadId });
  const processedMessages = processMessages(messages, assistant);

  const { runner, messagesToCreate } = await runToolsAndHandleResponses(
    threadId,
    processedMessages,
    assistant.model ?? "gpt-4o"
  );

  try {
    const result = await runner.finalContent();
    for (const message of messagesToCreate) {
      await createMessage(message);
    }
    return result;
  } catch (error) {
    if (automode) {
      await deleteMessage(messages[messages.length - 1].id);
    }
    console.error(error);
    throw new Error(
      "Error running thread, thread state restored to before run"
    );
  }
}
