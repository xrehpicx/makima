import * as fs from "fs/promises";
import OpenAI from "openai";

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
