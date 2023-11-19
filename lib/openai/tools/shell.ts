import { $ } from "zx";

export async function shell({ commandString }: { commandString: string }) {
  try {
    const res = await $`sh -c ${commandString}`;
    return res.stdout.toString() || "Command ran successfully";
  } catch (e: any) {
    return e.stderr.toString() || "Command failed to run";
  }
}
