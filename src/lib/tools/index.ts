import { JSONSchema } from "openai/lib/jsonschema.mjs";
import { RunnableToolFunctionWithParse } from "openai/lib/RunnableFunction.mjs";
import { ZodSchema } from "zod";
import fs from "fs";
import zodToJsonSchema from "zod-to-json-schema";

export const toolsRegistry: RunnableToolFunctionWithParse<any>[] = [];

export async function registerAllTools() {
  console.log("registering tools");
  const files = fs.readdirSync(__dirname + "/functions");


  for (const file of files) {
    const module = await import(`./functions/${file}`);
    for (const key in module) {
      if (module[key]?.type === "function") {
        toolsRegistry.push(module[key]);
      }
    }
  }

  console.log(
    "registered tools",
    toolsRegistry.map((t) => t.function.name)
  );
}

await registerAllTools();

export function zodFunction<T extends object>({
  function: fn,
  schema,
  description = "",
  name,
}: {
  function: (args: T) => Promise<object>;
  schema: ZodSchema<T>;
  description?: string;
  name?: string;
}): RunnableToolFunctionWithParse<T> {
  return {
    type: "function",
    function: {
      function: fn,
      name: name ?? fn.name,
      description: description,
      parameters: zodToJsonSchema(schema) as JSONSchema,
      parse(input: string): T {
        const obj = JSON.parse(input);
        return schema.parse(obj);
      },
    },
  };
}
