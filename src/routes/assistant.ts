import { Elysia, t } from "elysia";
import {
  createAssistant,
  createAssistantSchema,
  deleteAssistant,
  disableAssistant,
  getAllAssistants,
  getAssistantByName,
  updateAssistant,
  updateAssistantSchema,
} from "../db/assistants";

export const assistantRoute = new Elysia({ prefix: "/assistant" })
  .get(
    "/",
    async ({ query: { name }, set }) => {
      if (name) {
        const res = await getAssistantByName(name);
        if (res.length === 0) {
          set.status = 404;
          return { message: "assistant not found" };
        }
        return res[0];
      }
      return await getAllAssistants();
    },
    {
      query: t.Object({
        name: t.Optional(t.String()),
      }),
      detail: {
        description: "Get the status of a assistant",
        summary: `examples:
            curl -X GET http://localhost:6666/assistant?name=bob
            `,
      },
    }
  )
  .post(
    "/",
    async ({ body }) => {
      const res = await createAssistant(body);
      return { message: "assistant created", id: res.oid };
    },
    {
      body: t.Omit(createAssistantSchema, ["id"]),
      detail: {
        description:
          "Creates a new assistant, the assistant will be enabled by default",
        summary: `examples:
      curl -X POST http://localhost:6666/assistant -d '{"name":"bob","prompt":"reply with hey im working"}' -H 'Content-Type: application/json'
      `,
      },
    }
  )
  .patch(
    "/",
    async ({ body }) => {
      await updateAssistant(body);
      return { message: "assistant updated" };
    },
    {
      body: t.Omit(updateAssistantSchema, ["id"]),
      detail: {
        description: "Update an assistant",
        summary: `examples:
      curl -X PATCH http://localhost:6666/assistant -d '{"name":"bob","prompt":"reply with hey im working"}' -H 'Content-Type: application/json'
      `,
      },
    }
  )
  .delete(
    "/",
    async ({ body: { name, permanent } }) => {
      if (permanent) {
        await deleteAssistant(name);
        return { message: "assistant deleted" };
      }
      await disableAssistant(name);
      return { message: "assistant disabled" };
    },
    {
      body: t.Object({
        name: t.String(),
        permanent: t.Boolean({ default: false }),
      }),
      detail: {
        description: "Disable an assistant",
        summary: `examples:
      curl -X DELETE http://localhost:6666/assistant -d '{"name":"bob"}' -H 'Content-Type: application/json'

      curl -X DELETE http://localhost:6666/assistant -d '{"name":"bob","permanent":true}' -H 'Content-Type: application/json'
      `,
      },
    }
  );
