import OpenAI from "openai";

function getSpecialNumber({ user_number }: { user_number: number }) {
  if (user_number > 5) return "The number has to be in range of 1 to 5";
  return user_number * 2;
}

export const functions: Record<string, typeof getSpecialNumber> = {
  get_special_number: getSpecialNumber,
};
export const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_special_number",
      description: "Get a special number based on user's input number",
      parameters: {
        type: "object",
        properties: {
          user_number: {
            type: "number",
            description:
              "The user's number that has to stay in range of 1 to 5",
          },
        },
        required: ["user_number"],
      },
    },
  },
];
