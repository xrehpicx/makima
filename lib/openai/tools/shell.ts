import { notifyChannel } from "@/interfaces/discord";
import { $ } from "zx";
import { ContextType } from "..";

import { makima_config } from "@/config";

export async function shell(
  { commandString }: { commandString: string },
  context?: ContextType
) {
  if (
    context?.user !== makima_config.creator.discord_username ||
    context?.user !== makima_config.interfaces.telegram.admin_username
  ) {
    // run in isolated docker container using docker run without mounting anything
    try {
      notifyChannel(
        `Running command: ${`docker run --rm alpine ${commandString}`}`
      );
      const res = await $`docker run --rm alpine ${commandString}`;
      notifyChannel(
        `stdout: ${res.stdout.toString()}` || "Command ran successfully"
      );
      return `stdout: ${res.stdout.toString()}` || "Command ran successfully";
    } catch (error) {
      notifyChannel(`stderr: ${error}` || "Command failed to run");
      return `stderr: ${error}` || "Command failed to run";
    }
  }
  try {
    notifyChannel(`Running command: ${commandString}`);
    const res = await $`cd ~/ && sh -c ${commandString}`;
    return `stdout: ${res.stdout.toString()}` || "Command ran successfully";
  } catch (e: any) {
    notifyChannel(`Command failed to run: ${commandString}`);
    return `stderr: ${e.stderr.toString()}` || "Command failed to run";
  }
}
