import { $ } from "zx";

export async function shell({ commandString }: { commandString: string }) {
  try {
    const res = await $`sh -c ${commandString}`;
    return res.stdout.toString() || "Command ran successfully";
  } catch (e: any) {
    return e.stderr.toString() || "Command failed to run";
  }
}



// shell commands that runs all commands in a tmux session called makima and creates that session if it does not already exist
// create session if it does not exist
export async function tmux_shell({ commandString }: { commandString: string }) {

  try {
    const res = await $`sh -c "tmux has-session -t makima"`;
    if (res.stdout.toString().includes("can't find session")) {
      await $`sh -c "tmux new-session -d -s makima"`;
    }
  } catch (e: any) {
    console.log(e);
  }

  try {
    const res = await $`sh -c "tmux send-keys -t makima ${commandString} Enter"`;
    return res.stdout.toString() || "Command ran successfully";
  } catch (e: any) {
    return e.stderr.toString() || "Command failed to run";
  }
}