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
        console.log(res);
        if (!res) {
          set.status = 404;
          return { message: "Assistant not found" };
        }
        return res;
      }
      return await getAllAssistants();
    },
    {
      query: t.Object({
        name: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get Assistants",
        description: `Get the details of an assistant by name, including the tools associated with the assistant. If the 'name' query parameter is provided, it will return the assistant with the matching name. If no 'name' query parameter is provided, it will return all assistants.`,
        tags: ["Assistant"],
      },
    }
  )
  .post(
    "/",
    async ({ body }) => {
      const res = await createAssistant(body);
      return { message: "Assistant created", data: res[0] };
    },
    {
      body: t.Omit(createAssistantSchema, ["id"]),
      detail: {
        summary: "Create Assistant",
        description:
          "Creates a new assistant with the provided details. The assistant will be enabled by default.",
        tags: ["Assistant"],
      },
    }
  )
  .patch(
    "/",
    async ({ body }) => {
      await updateAssistant(body);
      return { message: "Assistant updated" };
    },
    {
      body: t.Omit(updateAssistantSchema, ["id"]),
      detail: {
        summary: "Update Assistant",
        description: `Update an assistant with the provided details. The 'name' field is required to identify the assistant to be updated.`,
        tags: ["Assistant"],
      },
    }
  )
  .delete(
    "/",
    async ({ body: { name, permanent } }) => {
      if (permanent) {
        await deleteAssistant(name);
        return { message: "Assistant deleted" };
      }
      await disableAssistant(name);
      return { message: "Assistant disabled" };
    },
    {
      body: t.Object({
        name: t.String(),
        permanent: t.Boolean({ default: false }),
      }),
      detail: {
        summary: "Delete Assistant",
        description: `Disable an assistant. If the 'permanent' flag is set to true, the assistant will be permanently deleted from the database. Otherwise, it will be disabled.`,
        tags: ["Assistant"],
      },
    }
  );
