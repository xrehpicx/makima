import {
  OpenAIApi,
  Configuration,
  CreateChatCompletionRequest,
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
} from "openai";
import { ToolFunction, handleToolUse } from "@typeai/core";

function getSpecialNumber(user_number: number) {
  return user_number * 2;
}

// Init OpenAI client
const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

// Generate JSON Schema for function and dependent types
const getSpecialNumberTool = ToolFunction.from(getSpecialNumber);

// Run a chat completion sequence
const messages: ChatCompletionRequestMessage[] = [
  {
    role: ChatCompletionRequestMessageRoleEnum.User,
    content: "What's the special number",
  },
];
const request: CreateChatCompletionRequest = {
  model: "gpt-3.5-turbo",
  messages,
  functions: [getSpecialNumberTool.schema],
  stream: false,
  max_tokens: 1000,
};

const { data: response } = await openai.createChatCompletion(request);

// Transparently handle any LLM calls to your function.
// handleToolUse() returns OpenAI's final response after
// any/all function calls have been completed
const responseData = await handleToolUse(openai, request, response);
const result = responseData?.choices[0].message;
