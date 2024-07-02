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
          return { message: "Thread not found" };
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
        summary: "Get Thread Status",
        description:
          "Get the status of a thread by name or retrieve all threads.",
        tags: ["Threads"],
      },
    }
  )
  .post(
    "/",
    async ({ body }) => {
      const res = await createThread(body.name);
      return { message: "Thread created", data: res };
    },
    {
      body: t.Omit(createThreadSchema, ["id"]),
      detail: {
        summary: "Create Thread",
        description:
          "Create a new thread by specifying the name of the thread in the request body.",
        tags: ["Threads"],
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
      return { message: "Thread disabled, but the messages still exist" };
    },
    {
      body: t.Object({
        name: t.String(),
        force: t.Optional(t.Boolean()),
      }),
      detail: {
        summary: "Delete Thread",
        description:
          "Delete a thread by name. Optionally, force delete the thread and its messages.",
        tags: ["Threads"],
      },
    }
  );

export const messagesRoutes = new Elysia({ prefix: "/message" })
  .get(
    "/",
    async ({ query: { thread_id }, set }) => {
      const exists = await checkThread(thread_id);
      console.log("Checking if thread exists with ID:", thread_id, exists);

      if (!exists) {
        set.status = 404;
        return { message: "Thread not found" };
      }

      const messages = await getMessages({ threadId: thread_id });

      console.log(
        "Retrieving messages for thread with ID:",
        thread_id,
        messages
      );

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
        summary: "Get Messages",
        description:
          "Get all messages of a thread by specifying the thread ID in the query parameters.",
        tags: ["Messages"],
      },
    }
  )
  .post(
    "/",
    async ({ body }) => {
      try {
        await createMessage(body);
        return { message: "Message created successfully" };
      } catch (e) {
        throw e;
      }
    },
    {
      body: t.Omit(createMessageSchema, ["id", "tool_call_id", "tool_calls"]),
      detail: {
        summary: "Create Message",
        description:
          "Create a new message by specifying the message details in the request body.",
        tags: ["Messages"],
      },
    }
  )
  .delete(
    "/",
    async ({ body: { message_id, thread_id } }) => {
      if (message_id) {
        await deleteMessage(message_id);
        return { message: "Message deleted successfully" };
      }
      if (thread_id) {
        await deleteMessages(thread_id);
        return { message: "Messages deleted successfully" };
      }
    },
    {
      body: t.Object({
        message_id: t.Optional(t.Numeric()),
        thread_id: t.Optional(t.Numeric()),
      }),
      detail: {
        summary: "Delete Message",
        description:
          "Delete a message by specifying the message ID or delete all messages in a thread by specifying the thread ID.",
        tags: ["Messages"],
      },
    }
  );
