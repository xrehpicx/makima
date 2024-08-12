import { JSONSchema } from "openai/lib/jsonschema.mjs";
import { RunnableToolFunctionWithParse } from "openai/lib/RunnableFunction.mjs";
import { ZodSchema } from "zod";
import fs from "fs";
import zodToJsonSchema from "zod-to-json-schema";

export async function getTools(context: any) {
  const toolsRegistry: RunnableToolFunctionWithParse<any>[] = [];
  const files = fs.readdirSync(__dirname + "/functions");

  for (const file of files) {
    const module = await import(`./functions/${file}`);
    for (const key in module) {
      if (module[key]?.type === "function") {
        const mod = module[key];
        mod.function.function = (args: any) => {
          return mod.function.function(args, context);
        };
        toolsRegistry.push();
      }
    }
  }

  console.log(
    "registered local tools",
    toolsRegistry.map((t) => t.function.name),
  );

  return toolsRegistry;
}

export function zodFunction<T extends object>({
  function: fn,
  schema,
  description = "",
  name,
}: {
  function: (args: T, props: any) => Promise<object | string>;
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
