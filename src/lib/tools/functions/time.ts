import { z } from "zod";
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
