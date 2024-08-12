import axios from 'axios';
import { Tool } from '../../db/types';
import { JSONSchema } from 'openai/lib/jsonschema.mjs';
import { RunnableToolFunctionWithParse } from 'openai/lib/RunnableFunction.mjs';

export function createOpenAIRunnableTool<T extends Record<string, any>>(tool: Tool): RunnableToolFunctionWithParse<T> {
  console.log(`Creating runnable tool for tool ${tool.name}:`, tool);
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as JSONSchema,
      async function(args: T) {
        console.log(`Calling tool ${tool.name} with args:`, args);
        try {
          let response;

          if (tool.method.toUpperCase() === 'GET') {
            // Send parameters as query string for GET requests
            response = await axios.get(tool.endpoint, {
              params: args,
              headers: {
                'Content-Type': 'application/json',
              },
            });
          } else {
            // Send parameters as JSON body for POST, PUT, DELETE, etc.
            response = await axios({
              method: tool.method,
              url: tool.endpoint,
              data: args,
              headers: {
                'Content-Type': 'application/json',
              },
            });
          }

          return response.data;
        } catch (error) {
          console.error(`Error calling tool ${tool.name}:`, error);
          throw new Error(`Tool ${tool.name} failed.`);
        }
      },
      parse(input: string): T {
        console.log(`Parsing input for tool ${tool.name}:`, input)
        const obj = JSON.parse(input);
        return obj as T;
      },
    },
  };
}
