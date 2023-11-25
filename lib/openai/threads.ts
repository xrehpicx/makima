import * as fs from "fs/promises";
import OpenAI from "openai";
import {
  save_memories_to_memory_space,
  save_to_memory_space,
} from "./tools/makima-data-manager";
import { ContextType } from ".";

// Define types
type ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;

interface ConversationThread {
  id: string;
  messages: ChatCompletionMessageParam[];
}

// File paths
const threadsFilePath = "./threads.json";

// Function to read threads from file
async function readThreadsFromFile(): Promise<
  Record<string, ChatCompletionMessageParam[]>
> {
  try {
    const data = await fs.readFile(threadsFilePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist or there is an error, return an empty object
    return {};
  }
}

// Function to write threads to file
async function writeThreadsToFile(
  threads: Record<string, ChatCompletionMessageParam[]>
): Promise<void> {
  const data = JSON.stringify(threads, null, 2);
  await fs.writeFile(threadsFilePath, data, "utf-8");
}

// Function to update or create a thread with multiple messages
export async function updateThread(
  threadId: string,
  messages: ChatCompletionMessageParam[],
  onCreateMessages: ChatCompletionMessageParam[] = []
): Promise<ConversationThread> {
  const allMessages = [...onCreateMessages, ...messages];
  let threads = await readThreadsFromFile();

  if (!threads[threadId]) {
    // If the thread doesn't exist, create it
    threads[threadId] = allMessages;
  } else {
    // Thread already exists, update the messages
    threads[threadId] = [...threads[threadId], ...messages];
  }

  await writeThreadsToFile(threads);

  // Resolve with the updated thread, including all messages
  return { id: threadId, messages: threads[threadId] };
}

export async function clearThread(threadId: string) {
  try {
    const threads = await readThreadsFromFile();

    // Check if the threadId exists before deleting
    if (threads.hasOwnProperty(threadId)) {
      console.log("Clearing:", threadId);

      // Use the delete operator to remove the thread
      console.log("deleting", delete threads[threadId]);

      await writeThreadsToFile(threads);
    } else {
      console.log(`Thread with ID ${threadId} not found.`);
    }
  } catch (error) {
    console.error("Error clearing thread:", error);
  }
}

// function to delete all threads
export async function clearAllThreads() {
  try {
    await writeThreadsToFile({});
  } catch (error) {
    console.error("Error clearing all threads:", error);
  }
}

// Function to get a thread by ID
export async function getThread(
  threadId: string
): Promise<ConversationThread | undefined> {
  const threads = await readThreadsFromFile();
  const messages = threads[threadId];

  if (messages) {
    return { id: threadId, messages };
  }

  return undefined;
}

let moving = false;

export async function move_to_long_term_memory(
  channel_id: string,
  context?: ContextType
) {
  if (moving) return;
  const thread = await getThread(channel_id);
  if (!thread) return;

  let messages = thread.messages;

  // filter out old messages that were already moved to long term memory
  messages = messages.filter((m) =>
    String(m.content)?.startsWith("search_id: ")
  );

  const system_prompts = messages
    .slice(0, 5)
    .filter((m) => m.role === "system");

  const messages_mid_index = Math.floor(messages.length / 1.5);

  const mid_user_message_index = messages.findIndex(
    (m, i) => i > messages_mid_index - 4 && m.role === "user"
  );

  const long_term_memory_messages = messages.slice(0, mid_user_message_index);
  const scliced_messages = messages.slice(mid_user_message_index);

  moving = true;
  console.log("moving to long term memory");

  const ids = await save_memories_to_memory_space(
    long_term_memory_messages.map((m) => String(m.content)),
    channel_id,
    { context }
  );

  const updated_long_term_memory_messages = ids.map(
    (id, i) =>
      ({
        content: `search_id: ${id}`,
        role: long_term_memory_messages[i].role,
      } as OpenAI.ChatCompletionMessageParam)
  );
  await clearThread(channel_id);
  // merge long term and sliced messages
  await updateThread(
    channel_id,
    scliced_messages.concat(updated_long_term_memory_messages),
    system_prompts
  );

  console.log("moved to long term memory");
  moving = false;
}
