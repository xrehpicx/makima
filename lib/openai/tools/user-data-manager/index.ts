import { notifyChannel } from "@/interfaces/discord";
import { ContextType } from "../..";
import { OllamaEmbeddings } from "langchain/embeddings/ollama";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { FaissStore } from "langchain/vectorstores/faiss";
import { fs } from "zx";
import { Document } from "langchain/document";
import { isInLimit } from "..";

// const embeddings = new OllamaEmbeddings({
//   model: "mistral",
// });

// const embeddings = new OpenAIEmbeddings();

export function get_user_context({}, context?: ContextType) {
  if (!context) return "No context available for this user";
  return JSON.stringify(context);
}

let active_memory_spaces: { id: string; store: FaissStore }[] = [];

export async function save_user_memory(
  { content }: { content: string },
  context?: ContextType
) {
  if (
    !isInLimit(
      [
        {
          role: "user",
          content,
        },
      ],
      500
    )
  ) {
    return "Memory too long, to remember";
  }
  const memory_space = context?.channel_id || context?.user || "general";

  const embeddings = new OpenAIEmbeddings({
    configuration: {
      fetch: (url, init) => fetch(url, { ...init, signal: context?.signal }),
    },
  });
  const embeddingsDirectory = `/home/makima/makima_memory/embeddings/${memory_space}`;

  const exists = await fs.exists(`${embeddingsDirectory}/docstore.json`);

  if (!exists) {
    notifyChannel(`New memory space: ${memory_space}`);
    const id = String(
      context?.meta ? JSON.stringify(context.meta) : Math.random()
    );
    const tmp = await FaissStore.fromDocuments(
      [
        new Document({
          pageContent: `This memory was created by ${context?.user}`,
          metadata: { id },
        }),
      ],
      embeddings
    );

    await tmp.addDocuments(
      [
        new Document({
          pageContent: `${content}
          data_context: ${JSON.stringify(context)}`,
          metadata: { id },
        }),
      ],
      { ids: [id] }
    );
    await tmp.save(embeddingsDirectory);
    active_memory_spaces.push({ id: embeddingsDirectory, store: tmp });
    console.log("This is a new user, saved:", content, "to memory");
    return "succesfully saved to memory";
  }

  notifyChannel(`Loading from space: ${memory_space}`);
  const cachedVectorStore = active_memory_spaces.find(
    (s) => s.id === embeddingsDirectory
  )?.store;

  const vectorStore =
    cachedVectorStore ??
    (await FaissStore.load(embeddingsDirectory, embeddings));

  if (!cachedVectorStore)
    active_memory_spaces.push({ id: embeddingsDirectory, store: vectorStore });

  try {
    const id = String(
      context?.meta ? JSON.stringify(context.meta) : Math.random()
    );
    const ids = await vectorStore.addDocuments(
      [
        new Document({
          pageContent: `${content}
          data_context: ${JSON.stringify(context)}`,
          metadata: { id },
        }),
      ],
      { ids: [id] }
    );
    await vectorStore.save(embeddingsDirectory);
    console.log("Saved with ids of: ", ids);
    notifyChannel(
      `Memory saved to: ${memory_space}, id: ${id}, content: ${content}`
    );
    console.log("Memory saved");
    return "Memory saved";
  } catch (err) {
    console.log("Error saving memory:", err);
    return `Error saving memory: ${err}`;
  }
}

export async function recall_user_memory(
  { content }: { content: string },
  context?: ContextType
) {
  const memory_space = context?.channel_id || context?.user || "general";
  const embeddingsDirectory = `/home/makima/makima_memory/embeddings/${memory_space}`;
  const exists = await fs.exists(`${embeddingsDirectory}/docstore.json`);
  const embeddings = new OpenAIEmbeddings({
    configuration: {
      fetch: (url, init) => fetch(url, { ...init, signal: context?.signal }),
    },
  });
  if (!exists) {
    notifyChannel(`New memory space: ${memory_space}`);
    console.log("This is a new user, no memories saved yet");
    return "This is a new user, no memories saved yet";
  }

  const cachedVectorStore = active_memory_spaces.find(
    (s) => s.id === embeddingsDirectory
  )?.store;

  const vectorStore =
    cachedVectorStore ??
    (await FaissStore.load(embeddingsDirectory, embeddings));

  if (!cachedVectorStore)
    active_memory_spaces.push({ id: embeddingsDirectory, store: vectorStore });

  notifyChannel(`Loading from space: ${memory_space}`);
  const resultOne = await vectorStore.similaritySearch(content, 1);
  notifyChannel(
    `Found from space: ${resultOne
      .map((r) => r.pageContent)
      .join("\nnext memory:\n")}`
  );
  console.log(resultOne);
  return `found memories: 
  ${resultOne.map((r) => r.pageContent).join("\nnext memory:\n")}`;
}

export async function forget_user_memory(
  { content }: { content: string },
  context?: ContextType
) {
  const memory_space = context?.channel_id || context?.user || "general";
  const embeddings = new OpenAIEmbeddings({
    configuration: {
      fetch: (url, init) => fetch(url, { ...init, signal: context?.signal }),
    },
  });
  const embeddingsDirectory = `/home/makima/makima_memory/embeddings/${memory_space}`;
  const exists = await fs.exists(`${embeddingsDirectory}/docstore.json`);

  if (!exists) {
    console.log("This is a new user, no memories saved yet");
    return "This is a new user, no memories saved yet";
  }

  try {
    const cachedVectorStore = active_memory_spaces.find(
      (s) => s.id === embeddingsDirectory
    )?.store;

    const vectorStore =
      cachedVectorStore ??
      (await FaissStore.load(embeddingsDirectory, embeddings));

    if (!cachedVectorStore)
      active_memory_spaces.push({
        id: embeddingsDirectory,
        store: vectorStore,
      });

    const resultOne = await vectorStore.similaritySearch(content, 1);

    console.log("Forgetting: ", resultOne, resultOne[0].metadata.id);
    console.log(
      "IDS: ",
      resultOne.map((d) => d.metadata.id || String(d.metadata))
    );
    await vectorStore.delete({
      ids: resultOne.map((d) => d.metadata.id || String(d.metadata)),
    });
    await vectorStore.save(embeddingsDirectory);

    notifyChannel(`Memory forgotten: ${resultOne[0].pageContent}`);
    console.log("Memory forgotten");
    return "Memory forgotten";
  } catch (error) {
    notifyChannel(`Error forgetting memory: ${error}`);
    console.log("Error forgetting memory:", error);
    return `Error forgetting memory: ${error}`;
  }
}

export async function delete_all_user_memories({}, context?: ContextType) {
  const memory_space = context?.channel_id || context?.user || "general";

  const embeddingsDirectory = `/home/makima/makima_memory/embeddings/${memory_space}`;
  const exists = await fs.exists(`${embeddingsDirectory}/docstore.json`);

  if (!exists) {
    console.log("This is a new user, nothing to delete");
    return "This is a new user, nothing to delete";
  }

  // delete directory
  try {
    await fs.rm(embeddingsDirectory, { recursive: true, force: true });
    active_memory_spaces = active_memory_spaces.filter(
      (s) => s.id !== embeddingsDirectory
    );
    console.log("Deleted all memories");
    return "Deleted all memories";
  } catch (error) {
    console.log("Error deleting memories:", error);
    return `Error deleting memories: ${error}`;
  }
}
