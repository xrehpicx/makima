import Elysia, { t } from "elysia";
import { runThread } from "../lib/runners/thread";
import { checkThread, createMessage, createMessageSchema } from "../db/threads";
import { checkAssistant } from "../db/assistants";

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
  }
);

export const threadRunnerHelper = new Elysia({ prefix: "/auto" });

const runnerData = t.Object({
  threadId: t.Number(),
  assistantId: t.Number(),
  message: t.Partial(
    t.Omit(createMessageSchema, ["threadId", "id", "createdAt"])
  ),
});

threadRunnerHelper.post(
  "/",
  async ({ body }) => {
    if (!body.message.content) {
      throw new Error("Message content is required");
    }

    const thread_id = body.threadId;

    const thread_exists = await checkThread(thread_id);

    const assistant_exists = await checkAssistant(body.assistantId);

    if (!thread_exists && !assistant_exists) {
      throw new Error("Thread and Assistant not found");
    }

    if (!thread_exists) {
      throw new Error("Thread not found");
    }

    if (!assistant_exists) {
      throw new Error("Assistant not found");
    }

    await createMessage({
      content: body.message.content,
      role: body.message.role ?? "user",
      threadId: thread_id,
    });

    return await runThread(body, true);
  },
  {
    body: runnerData,
    detail: {
      description: "Run a thread with a message",
      summary: `examples:
            curl -X POST http://localhost:6666/thread/auto -d '{"threadId":1, "assistantId":1, "message": {"content":"hello"}}' -H 'Content-Type: application/json'
            `,
    },
  }
);

threadsRunnerRoutes.use(threadRunnerHelper);
