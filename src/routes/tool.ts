import { Elysia, t } from "elysia";
import {
  createTool,
  createToolSchema,
  deleteTool,
  getAllTools,
  getToolByName,
  updateTool,
  updateToolSchema,
} from "../db/tools";

export const toolRoute = new Elysia({ prefix: "/tools" })
  .get(
    "/",
    async ({ query: { name }, set }) => {
      if (name) {
        const res = await getToolByName(name);
        if (res.length === 0) {
          set.status = 404;
          return { message: "Tool not found" };
        }
        return res[0];
      }
      return await getAllTools();
    },
    {
      query: t.Object({
        name: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get Tools",
        description: `Get the details of a tool by name. If the 'name' query parameter is provided, it will return the tool with the matching name. If no 'name' query parameter is provided, it will return all tools.`,
        tags: ["Tools"],
      },
    }
  )
  .post(
    "/",
    async ({ body }) => {
      const res = await createTool(body);
      return { message: "Tool created", data: res[0] };
    },
    {
      body: t.Omit(createToolSchema, ["id"]),
      detail: {
        summary: "Create Tool",
        description: "Creates a new tool with the provided details.",
        tags: ["Tools"],
      },
    }
  )
  .patch(
    "/",
    async ({ body }) => {
      await updateTool(body);
      return { message: "Tool updated" };
    },
    {
      body: t.Omit(updateToolSchema, ["id"]),
      detail: {
        summary: "Update Tool",
        description: `Update a tool with the provided details. The 'name' field is required to identify the tool to be updated.`,
        tags: ["Tools"],
      },
    }
  )
  .delete(
    "/",
    async ({ body: { name } }) => {
      await deleteTool(name);
      return { message: "Tool deleted" };
    },
    {
      body: t.Object({
        name: t.String(),
      }),
      detail: {
        summary: "Delete Tool",
        description: `Delete a tool by its name.`,
        tags: ["Tools"],
      },
    }
  );
