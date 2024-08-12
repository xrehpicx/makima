import { z } from "zod";
import { createMemory } from "../../../db/memories";
import { zodFunction } from "..";

const GetTimeParams = z.object({});
type GetTimeParams = z.infer<typeof GetTimeParams>;
async function get_date_time({}: GetTimeParams) {
  return { response: new Date().toLocaleString() };
}

export const get_date_time_tool = zodFunction({
  function: get_date_time,
  schema: GetTimeParams,
  description: "Get the current date and time",
  name: "get_date_time",
});

const CreateMemories = z.object({
  title: z.string(),
  description: z.string(),
});

type CreateMemories = z.infer<typeof CreateMemories>;
async function create_memories(
  { title, description }: CreateMemories,
  {
    assistantId,
    threadId,
  }: {
    assistantId: number;
    threadId: number;
  },
) {
  try {
    await createMemory({
      assistantId,
      threadId,
      memory: { title, description },
    });
    return { response: "Memory created successfully" };
  } catch (e) {
    return { error: e };
  }
}

export const create_memories_tool = zodFunction({
  function: create_memories,
  schema: CreateMemories,
  description: "Create a new memory",
  name: "create_memories",
});
