import Elysia, { t } from "elysia";
import { runThread, threadsQueueController } from "../lib/runners/thread";
import {
  checkThread,
  createMessage,
  createMessageSchema,
  getThreadID,
} from "../db/threads";
import { checkAssistant, getAssistantID } from "../db/assistants";

export const threadsRunnerRoutes = new Elysia();

threadsRunnerRoutes.post(
  "/run",
  async ({ body }) => {
    return await runThread(body);
  },
  {
    body: t.Object({
      threadId: t.Number(),
      assistantId: t.Number(),
    }),
    detail: {
      summary: "Run Thread",
      description: `Run a thread with the specified threadId and assistantId.`,
      tags: ["Threads"],
    },
  },
);

export const threadRunnerHelper = new Elysia({ prefix: "/auto" });

const runnerData = t.Object({
  message: t.Partial(
    t.Omit(createMessageSchema, ["threadId", "id", "createdAt"]),
  ),
  threadId: t.Optional(t.Number()),
  assistantId: t.Optional(t.Number()),
  threadName: t.Optional(t.String()),
  assistantName: t.Optional(t.String()),
});

threadRunnerHelper.post(
  "/",
  async ({ body }) => {
    if (!body.message.content) {
      throw new Error("Message content is required");
    }

    let thread_id = body.threadId;
    let thread_exists = false;

    if (!thread_id) {
      if (!body.threadName) {
        throw new Error("Thread name is required");
      }

      const threadId = await getThreadID(body.threadName);

      if (!threadId) {
        throw new Error("Thread not found");
      }
      thread_exists = true;
      thread_id = threadId;
    } else {
      thread_exists = await checkThread(thread_id);
    }

    let assistant_id = body.assistantId;
    let assistant_exists = false;

    if (!assistant_id) {
      if (!body.assistantName) {
        throw new Error("Assistant name is required");
      }

      console.log("Getting assistant ID for: ", body.assistantName);
      const assistantId = await getAssistantID(body.assistantName);

      if (!assistantId) {
        console.log("Assistant not found");
        throw new Error("Assistant not found");
      }

      assistant_exists = true;

      assistant_id = assistantId;
      console.log("Assistant ID: ", assistant_id);
    } else {
      try {
        assistant_exists = await checkAssistant(assistant_id);
      } catch (e) {
        console.log(e);
        throw new Error("Assistant not found");
      }
    }

    if (!thread_exists && !assistant_exists) {
      throw new Error("Thread and Assistant not found");
    }

    if (!thread_exists) {
      throw new Error("Thread not found");
    }

    if (!assistant_exists) {
      throw new Error("Assistant not found");
    }

    await threadsQueueController.waitForThread(thread_id);

    await createMessage({
      content: body.message.content,
      role: body.message.role ?? "user",
      threadId: thread_id,
    });

    return await runThread(
      {
        threadId: thread_id,
        assistantId: assistant_id,
      },
      true,
    );
  },
  {
    body: runnerData,
    detail: {
      summary: "Auto run Thread",
      description: `Automatically runs a thread with a message. If the threadId and assistantId are provided, it runs the thread with the specified IDs. If the threadId and assistantId are not provided, it looks up the thread and assistant using their names and runs the thread if found.`,
      tags: ["Auto threads"],
    },
  },
);

threadsRunnerRoutes.use(threadRunnerHelper);
