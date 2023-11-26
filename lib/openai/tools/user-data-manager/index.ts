import { notifyChannel } from "@/interfaces/discord";
import { ContextType } from "../..";
import { OllamaEmbeddings } from "langchain/embeddings/ollama";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { FaissStore } from "langchain/vectorstores/faiss";
import { fs } from "zx";
import { Document } from "langchain/document";
import { isInLimit } from "..";
import { makima_config } from "@/config";
import { nanoid } from "nanoid";

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
  { content, context: ai_context }: { content: string; context: string },
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
  const embeddingsDirectory = `${makima_config.env.memory_dir}/embeddings/${memory_space}`;

  const exists = await fs.exists(`${embeddingsDirectory}/docstore.json`);

  if (!exists) {
    notifyChannel(`New memory space: ${memory_space}`);
    const id = String(nanoid());
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
          pageContent: `
          context: ${ai_context}
          content: ${content}
          timestamp: ${Date.now()}`,
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
    const id = String(nanoid());
    const ids = await vectorStore.addDocuments(
      [
        new Document({
          pageContent: `
          context: ${ai_context}
          content: ${content}
          timestamp: ${Date.now()}`,
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
    return `memory saved with id: ${id}`;
  } catch (err) {
    console.log("Error saving memory:", err);
    return `Error saving memory: ${err}`;
  }
}

export async function recall_user_memory(
  { content, count }: { content: string; count: string },
  context?: ContextType
) {
  const memory_space = context?.channel_id || context?.user || "general";
  const embeddingsDirectory = `${makima_config.env.memory_dir}/embeddings/${memory_space}`;
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
  const resultOne = await vectorStore.similaritySearch(
    content,
    isNaN(Number(count)) ? 4 : Number(count)
  );
  notifyChannel(
    `found ${resultOne.length} memories: 
  ${resultOne.map((r) => r.pageContent).join("\nnext memory:\n")}\n`
  );
  console.log(resultOne);
  return `found ${resultOne.length} memories: 
  ${resultOne
    .map((r) => `memory_id: ${r.metadata.id}\nmemory_content: ${r.pageContent}`)
    .join("\nnext_memory\n")}`;
}

export async function forget_user_memory(
  { memory_id }: { memory_id: string },
  context?: ContextType
) {
  const memory_space = context?.channel_id || context?.user || "general";
  const embeddings = new OpenAIEmbeddings({
    configuration: {
      fetch: (url, init) => fetch(url, { ...init, signal: context?.signal }),
    },
  });
  const embeddingsDirectory = `${makima_config.env.memory_dir}/embeddings/${memory_space}`;
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

    // const resultOne = await vectorStore.similaritySearch(content);

    // console.log("Forgetting: ", resultOne, resultOne[0].metadata.id);
    // console.log(
    //   "IDS: ",
    //   resultOne.map((d) => d.metadata.id || String(d.metadata))
    // );
    await vectorStore.delete({
      ids: [memory_id],
    });
    await vectorStore.save(embeddingsDirectory);

    notifyChannel(`Memory forgotten: ${memory_id}`);
    console.log("Memory forgotten");
    return "Memory forgotten";
  } catch (error) {
    notifyChannel(`Error forgetting memory: ${error}`);
    console.log("Error forgetting memory:", error);
    return `Error forgetting memory: ${error}`;
  }
}

export async function update_user_memory(
  {
    memory_id,
    updated_content,
    context: ai_context,
  }: { memory_id: string; updated_content: string; context: string },
  context?: ContextType
) {
  const memory_space = context?.channel_id || context?.user || "general";
  const embeddings = new OpenAIEmbeddings({
    configuration: {
      fetch: (url, init) => fetch(url, { ...init, signal: context?.signal }),
    },
  });
  const embeddingsDirectory = `${makima_config.env.memory_dir}/embeddings/${memory_space}`;
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

    // const resultOne = await vectorStore.similaritySearch(content);

    // console.log("Updating: ", resultOne, resultOne[0].metadata.id);
    // console.log(
    //   "IDS: ",
    //   resultOne.map((d) => d.metadata.id || String(d.metadata))
    // );
    // check if memory_id exists
    if (!vectorStore.getDocstore().search(memory_id)) {
      return `Memory with id: ${memory_id} does not exist, cant update`;
    }
    memory_id &&
      (await vectorStore.delete({
        ids: [memory_id],
      }));

    const id = String(nanoid());
    await vectorStore.addDocuments(
      [
        new Document({
          pageContent: `
          context: ${ai_context}
          updated_content: ${updated_content}
          updated_timestamp: ${Date.now()}
          `,
          metadata: { id },
        }),
      ],
      { ids: [id] }
    );

    await vectorStore.save(embeddingsDirectory);

    notifyChannel(`Memory updated`);
    console.log("Memory updated");
    return `Memory updated and new memory_id is ${id}`;
  } catch (error) {
    notifyChannel(`Error updating memory: ${error}`);
    console.log("Error updating memory:", error);
    return `Error updating memory: ${error}`;
  }
}

export async function delete_all_user_memories({}, context?: ContextType) {
  const memory_space = context?.channel_id || context?.user || "general";

  const embeddingsDirectory = `${makima_config.env.memory_dir}/embeddings/${memory_space}`;
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
