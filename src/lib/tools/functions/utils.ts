import { z } from "zod";
import { zodFunction } from "..";
import { $ } from "bun";

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

const GetDockerContainerListParams = z.object({});
type GetDockerContainerListParams = z.infer<
  typeof GetDockerContainerListParams
>;

async function get_docker_container_list({}: GetDockerContainerListParams) {
  const response = await $`docker ps --format "{{.ID}}:{{.Names}}"`;
  return { stdout: response.stdout, stderr: response.stderr };
}

export const get_docker_container_list_tool = zodFunction({
  function: get_docker_container_list,
  schema: GetDockerContainerListParams,
  description: "Get the list of Docker containers",
  name: "get_docker_container_list",
});
