import { getAssistant } from "../../db/assistants";
import {
  createMessage,
  deleteMessage,
  getMessages,
  getThread,
  setRunningStatus,
  updateUsage,
} from "../../db/threads";
import OpenAI from "openai";
import { createOpenAIRunnableTool } from "../tools/actions";
import { getTools } from "../tools";

const openai = new OpenAI();

async function validateEntities(threadId: number, assistantId: number) {
  const threads = await getThread(threadId);
  if (!threads) {
    throw new Error("Thread not found");
  }

  const assistant = await getAssistant(assistantId);
  if (!assistant) {
    throw new Error("Assistant not found");
  }

  if (!assistant.enabled) {
    throw new Error("Assistant is disabled");
  }

  return { thread: threads[0], assistant };
}

function processMessages(
  messages: Awaited<ReturnType<typeof getMessages>>,
  assistant: Awaited<ReturnType<typeof getAssistant>>,
  additionalSystemPrompts?: string[],
) {
  const systemMessage = {
    role: "system",
    content: `Your name is: ${assistant.name}
    
    ${assistant.prompt}
    `,
  };

  const additionalPrompts = additionalSystemPrompts?.map((prompt) => ({
    role: "system",
    content: prompt,
  }));

  const formattedMessages: OpenAI.ChatCompletionMessageParam[] = messages.map(
    (message) =>
      ({
        ...message,
        threadId: undefined,
        id: undefined,
        createdAt: undefined,
      }) as unknown as OpenAI.ChatCompletionMessageParam,
  );

  return [
    systemMessage,
    ...(additionalPrompts ?? []),
    ...formattedMessages,
  ] as OpenAI.ChatCompletionMessageParam[];
}

async function runToolsAndHandleResponses(
  threadId: number,
  messages: OpenAI.ChatCompletionMessageParam[],
  model: string,
  assistant: Awaited<ReturnType<typeof getAssistant>>,
  signal: AbortSignal,
) {
  const runnableTools = assistant.tools
    .filter((t) => t.name)
    .map(createOpenAIRunnableTool); // Convert the assistant's tools to runnable tools

  const messagesToCreate: Parameters<typeof createMessage>[0][] = [];
  const localTools = await getTools({});
  const runner = openai.beta.chat.completions
    .runTools(
      {
        model,
        messages,
        tools: [...runnableTools, ...localTools],
      },
      {
        signal,
      },
    )
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
        (m) => m.role === "tool" && m.tool_call_id === message.tool_call_id,
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

export const threadsQueueController = {
  runningThreads: new Map<
    number,
    { promise: Promise<any>; abortController: AbortController }
  >(),

  addThread(
    threadId: number,
    promise: Promise<any>,
    abortController: AbortController,
  ) {
    console.log(`Adding thread ${threadId} to queue.`);
    this.runningThreads.set(threadId, { promise, abortController });
  },

  removeThread(threadId: number) {
    console.log(`Removing thread ${threadId} from queue.`);
    this.runningThreads.delete(threadId);
  },

  waitForThread(threadId: number): Promise<void> {
    const existingThread = this.runningThreads.get(threadId);
    if (existingThread) {
      console.log(`Waiting for thread ${threadId} to finish.`);
    } else {
      console.log(`No existing thread found for ${threadId}, continuing.`);
    }
    return existingThread ? existingThread.promise : Promise.resolve();
  },

  cancelThread(threadId: number) {
    const runningThread = this.runningThreads.get(threadId);
    if (runningThread) {
      console.log(`Canceling thread ${threadId}.`);
      runningThread.abortController.abort();
      this.removeThread(threadId);
    }
  },
};
export async function runThread(
  {
    threadId,
    assistantId,
    additionalSystemPrompts,
  }: {
    threadId: number;
    assistantId: number;
    additionalSystemPrompts?: string[];
  },
  automode?: boolean,
) {
  const signalController = new AbortController();

  const threadPromise = (async () => {
    const { thread, assistant } = await validateEntities(threadId, assistantId);
    const messages = await getMessages({ threadIdentifier: threadId });
    const processedMessages = processMessages(
      messages,
      assistant,
      additionalSystemPrompts,
    );
    const { runner, messagesToCreate } = await runToolsAndHandleResponses(
      threadId,
      processedMessages,
      assistant.model ?? "gpt-4o",
      assistant,
      signalController.signal,
    );
    try {
      await setRunningStatus(thread.name, 1);

      const result = await runner.finalContent();
      for (const message of messagesToCreate) {
        await createMessage(message);
      }

      await setRunningStatus(thread.name, 0);
      return result;
    } catch (error) {
      await setRunningStatus(thread.name, 0);
      if (automode) {
        await deleteMessage(messages[messages.length - 1].id);
      }
      console.error(error);
      throw new Error(
        "Error running thread, thread state restored to before run",
      );
    } finally {
      threadsQueueController.removeThread(threadId);
    }
  })();

  threadsQueueController.addThread(threadId, threadPromise, signalController);

  return await threadPromise;
}
