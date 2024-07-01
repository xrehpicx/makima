import { getAssistant } from "../../db/assistants";
import { getMessages, getThread } from "../../db/threads";
import OpenAI from "openai";
import { toolsRegistry } from "../tools";

const openai = new OpenAI();

export async function runThread({
  threadId,
  assistantId,
}: {
  threadId: number;
  assistantId: number;
}) {
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

  const runner = openai.beta.chat.completions.runTools({
    model: assistant.model ?? "gpt-4o",
    messages: finalMessages,
    tools: toolsRegistry,
  });

  const result = await runner.finalContent();

  return result;
}
