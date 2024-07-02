import { Elysia, t } from "elysia";
import {
  checkThread,
  createMessage,
  createMessageSchema,
  createThread,
  createThreadSchema,
  deleteMessage,
  deleteMessages,
  deleteThread,
  disableThread,
  getAllThreads,
  getMessages,
  getThreadByName,
} from "../db/threads";
import { threadsRunnerRoutes } from "./threads-runner";

export const threadsRoute = new Elysia({ prefix: "/thread" });

threadsRoute.use(threadsRunnerRoutes);

threadsRoute
  .get(
    "/",
    async ({ query: { name }, set }) => {
      if (name) {
        const res = await getThreadByName(name);
        if (res.length === 0) {
          set.status = 404;
          return { message: "thread not found" };
        }
        return res[0];
      }
      return await getAllThreads();
    },
    {
      query: t.Object({
        name: t.Optional(t.String()),
      }),
      detail: {
        description: "Get the status of a thread",
        summary: `examples:
            curl -X GET http://localhost:6666/thread?name=bobandme
            `,
      },
    }
  )
  .post(
    "/",
    async ({ body }) => {
      const res = await createThread(body.name);
      return { message: "thread created", data: res };
    },
    {
      body: t.Omit(createThreadSchema, ["id"]),
      detail: {
        description: "Creates a new thread",
        summary: `examples:
        curl -X POST http://localhost:6666/thread -d '{"name":"bobandme"}' -H 'Content-Type: application/json'
        `,
      },
    }
  )
  .delete(
    "/",
    async ({ body: { name, force } }) => {
      if (force) {
        return await deleteThread(name);
      }

      await disableThread(name);
      return { message: "thread disabled, but the messages still exist" };
    },
    {
      body: t.Object({
        name: t.String(),
        force: t.Optional(t.Boolean()),
      }),
      detail: {
        description: "Delete a thread",
        summary: `examples:
            curl -X DELETE http://localhost:6666/thread -d '{"name":"bobandme"}' -H 'Content-Type: application/json'

            curl -X DELETE http://localhost:6666/thread -d '{"name":"bobandme", "force": true}' -H 'Content-Type: application/json'
            `,
      },
    }
  );

export const messagesRoutes = new Elysia({ prefix: "/message" })
  .get(
    "/",
    async ({ query: { thread_id }, set }) => {
      const exists = await checkThread(thread_id);
      console.log("thread_id", thread_id, exists);

      if (!exists) {
        set.status = 404;
        return { message: "Thread not found" };
      }

      const messages = await getMessages({ threadId: thread_id });

      console.log("messages", messages);

      if (messages.length === 0) {
        set.status = 404;
        return { message: "No messages exist in this thread" };
      }

      return messages;
    },
    {
      query: t.Object({
        thread_id: t.Numeric(),
      }),
      detail: {
        description: "Get the all messages of a thread",
        summary: `examples:
            curl -X GET http://localhost:6666/message
            `,
      },
    }
  )
  .post(
    "/",
    async ({ body }) => {
      try {
        await createMessage(body);
        return { message: "message created" };
      } catch (e) {
        throw e;
      }
    },
    {
      body: t.Omit(createMessageSchema, ["id", "tool_call_id", "tool_calls"]),
      detail: {
        description: "Creates a new message",
        summary: `examples:
            curl -X POST http://localhost:6666/message -d '{"thread_id":1, "content":"hello"}' -H 'Content-Type: application/json'
            `,
      },
    }
  )
  .delete(
    "/",
    async ({ body: { message_id, thread_id } }) => {
      if (message_id) {
        await deleteMessage(message_id);
        return { message: "message deleted" };
      }
      if (thread_id) {
        await deleteMessages(thread_id);
        return { message: "messages deleted" };
      }
    },
    {
      body: t.Object({
        message_id: t.Optional(t.Numeric()),
        thread_id: t.Optional(t.Numeric()),
      }),
      detail: {
        description: "Delete a message",
        summary: `examples:
            curl -X DELETE http://localhost:6666/message -d '{"message_id":1}' -H 'Content-Type: application/json'
            `,
      },
    }
  );
