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
  const response = await $`docker ps --format "{{.ID}}:{{.Names}}"`.text();
  return { response };
}

export const get_docker_container_list_tool = zodFunction({
  function: get_docker_container_list,
  schema: GetDockerContainerListParams,
  description: "Get the list of Docker containers",
  name: "get_docker_container_list",
});

// function that runs all commands in a shell inside an ubuntu sandbox docker container
const RunBashCommand = z.object({
  commands: z
    .array(z.string())
    .describe("The commands to run in an ubuntu shell"),
});
type RunBashCommand = z.infer<typeof RunBashCommand>;

async function run_bash_command({ commands }: RunBashCommand) {
  const response =
    await $`docker run -it --rm --name makima-sandbox -v /mnt/makima-sandbox:/data -w /data ubuntu bash -c ${commands}`.text();
  return { response };
}

export const run_bash_command_tool = zodFunction({
  function: run_bash_command,
  schema: RunBashCommand,
  description: "Run commands in an ubuntu shell",
  name: "run_bash_command",
});
