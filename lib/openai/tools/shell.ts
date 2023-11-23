import { notifyChannel } from "@/interfaces/discord";
import { $ } from "zx";
import { ContextType } from "..";

import { makima_config } from "@/config";

export async function shell(
  { commandString }: { commandString: string },
  context?: ContextType
) {
  if (context?.user !== makima_config.creator.discord_username) {
    notifyChannel(
      `command blocked: ${commandString} being ran by ${context?.user}`
    );
    return "Command failed to run as user was not the admin";
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

// shell commands that runs all commands in a tmux session called makima and creates that session if it does not already exist
// create session if it does not exist
export async function tmux_shell(
  { commandString }: { commandString: string },
  context?: ContextType
) {
  const session_name = context?.channel_id || "makima";
  try {
    notifyChannel(`tmux shell: ${commandString}`);
    const res = await $`tmux has-session -t ${session_name}`;
    if (res.stdout.toString().includes("can't find session")) {
      await $`tmux new-session -d -s ${session_name}`;
    }
  } catch (e: any) {
    notifyChannel(`tmux shell: ${commandString}`);
    return e.stderr.toString() || "Command failed to run in tmux shell";
  }

  try {
    notifyChannel(`tmux shell: ${commandString}`);
    const res =
      await $`tmux send-keys -t ${session_name} "${commandString}" Enter`;
    return res.stdout.toString() || "Command ran successfully";
  } catch (e: any) {
    notifyChannel(`Command failed to run: ${commandString}`);
    return e.stderr.toString() || "Command failed to run";
  }
}

// shell function that specialises in accepting data that the user wants to store and stores in path of /home/makima/makima_memory/{username}/{...contexts}/{topic}.md
// export async function store_memory(
//   {
//     topic,
//     context_route,
//     data,
//   }: { topic: string; data: string; context_route: string },
//   context?: ContextType
// ) {
//   const username = context?.user || "unknown_user";
//   const channel_id = context?.channel_id || "unknown_channel";
//   // const contexts = context || "unknown_contexts";
//   const path = `/home/makima/makima_memory/${username}/${context_route}/${topic}.md`;
//   try {
//     notifyChannel(`Storing memory: ${topic}`);
//     await $`mkdir -p /home/makima/makima_memory/${username}/${context_route} && echo "${data}" > ${path}`;
//     notifyChannel(`Memory stored successfully and file path: ${path}`);
//     return `Memory stored successfully: ${topic}`;
//   } catch (e: any) {
//     notifyChannel(`Memory failed to store: ${topic}`);
//     return `Failed to store: ${e.stderr.toString()}. Explain user why it failed`;
//   }
// }

// export async function recall_memory(
//   { term, searchContext }: { term: string; searchContext: string },
//   context?: ContextType
// ) {
//   const username = context?.user || "unknown_user";

//   const res = fuzzySearchDirectory(
//     term,
//     `/home/makima/makima_memory/${username}/`,
//     searchContext
//   );

//   if (!res) {
//     return `No memories found for ${term} in ${searchContext}`;
//   }
//   return `Found memories for ${term} in ${searchContext}: ${res}`;
// }

// export async function forget_user_memory({}: {}, context?: ContextType) {
//   const username = context?.user;

//   if (!username) {
//     return "No user found";
//   }

//   const res = await $`rm -rf /home/makima/makima_memory/${username}`;
//   return res.stdout.toString();
// }
