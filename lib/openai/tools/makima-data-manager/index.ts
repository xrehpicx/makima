import { notifyChannel } from "@/interfaces/discord";
import { ContextType } from "../..";
import { FaissStore } from "langchain/vectorstores/faiss";
import { fs } from "zx";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { isInLimit } from "..";
import { makima_config } from "@/config";
import { nanoid } from "nanoid";

// const embeddings = new OllamaEmbeddings({
//   model: "mistral",
//   requestOptions: {
//     embeddingOnly: true,
//   },
//   maxRetries: 1,
//   maxConcurrency: 1,
// });

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 10,
  chunkOverlap: 2,
});

let active_memory_spaces: { id: string; store: FaissStore }[] = [];

export async function save_to_memory_space(
  content: string,
  memory_space: string,
  { signal, context }: { signal?: AbortSignal; context?: ContextType }
) {
  const embeddings = new OpenAIEmbeddings({
    configuration: {
      fetch: (url, init) => fetch(url, { ...init, signal }),
    },
  });

  const embeddingsDirectory = `${makima_config.env.memory_dir}/embeddings/${memory_space}`;
  const docs = await splitter.createDocuments([
    `content: ${content}
    timestamp: ${Date.now()}`,
  ]);

  const exists = await fs.exists(`${embeddingsDirectory}/docstore.json`);

  if (!exists) {
    notifyChannel(`New memory space: ${memory_space}`);
    const tmp = await FaissStore.fromDocuments(docs, embeddings);
    await tmp.save(embeddingsDirectory);
    active_memory_spaces.push({ id: embeddingsDirectory, store: tmp });
    console.log(
      "This is a temp memory space, saved:",
      content.slice(0, 100),
      "to memory"
    );
    return memory_space;
  }
  notifyChannel(`Adding to space: ${memory_space}`);
  const cachedVectorStore = active_memory_spaces.find(
    (s) => s.id === embeddingsDirectory
  )?.store;

  const vecStore =
    cachedVectorStore ??
    (await FaissStore.load(embeddingsDirectory, embeddings));

  if (!cachedVectorStore)
    active_memory_spaces.push({ id: embeddingsDirectory, store: vecStore });

  await vecStore.addDocuments(docs);
  await vecStore.save(embeddingsDirectory);
  console.log("Saved:", content.slice(0, 100), "to memory");
  notifyChannel(`Saved to space: ${memory_space}`);
  return memory_space;
}
export async function save_memories_to_memory_space(
  content: string[],
  memory_space: string,
  { signal, context }: { signal?: AbortSignal; context?: ContextType }
) {
  const embeddings = new OpenAIEmbeddings({
    configuration: {
      fetch: (url, init) => fetch(url, { ...init, signal }),
    },
  });

  const embeddingsDirectory = `${makima_config.env.memory_dir}/embeddings/${memory_space}`;
  const ids = content.map(() => nanoid());
  const docs = await splitter.createDocuments(
    content.map((c, i) => `${c}\nuuid: ${ids[i]}`)
  );

  const exists = await fs.exists(`${embeddingsDirectory}/docstore.json`);

  if (!exists) {
    notifyChannel(`New memory space: ${memory_space}`);
    const tmp = await FaissStore.fromDocuments(docs, embeddings);
    await tmp.save(embeddingsDirectory);
    active_memory_spaces.push({ id: embeddingsDirectory, store: tmp });
    console.log(
      "This is a temp memory space, saved:",
      content.slice(0, 100),
      "to memory"
    );
    return ids;
  }
  notifyChannel(`Adding to space: ${memory_space}`);
  const cachedVectorStore = active_memory_spaces.find(
    (s) => s.id === embeddingsDirectory
  )?.store;

  const vecStore =
    cachedVectorStore ??
    (await FaissStore.load(embeddingsDirectory, embeddings));

  if (!cachedVectorStore)
    active_memory_spaces.push({ id: embeddingsDirectory, store: vecStore });

  await vecStore.addDocuments(docs);
  await vecStore.save(embeddingsDirectory);
  console.log("Saved:", content.slice(0, 100), "to memory");
  notifyChannel(`Saved to space: ${memory_space}`);
  return ids;
}

export async function save_makima_memory(
  {
    content,
    memory_space,
    context: ai_context,
  }: { content: string; memory_space?: string; context: string },
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
      250
    )
  ) {
    return "Memory too long for ur memory, u could try to split it up or make it smaller and save it then.";
  }

  memory_space = memory_space || "makima";
  const embeddings = new OpenAIEmbeddings({
    configuration: {
      fetch: (url, init) => fetch(url, { ...init, signal: context?.signal }),
    },
  });
  const embeddingsDirectory = `${makima_config.env.memory_dir}/embeddings/${memory_space}`;

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
    return "This is a new user, saved: " + content + " to memory";
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
    return "Memory saved";
  } catch (err) {
    console.log("Error saving memory:", err);
    return `Error saving memory: ${err}`;
  }
}

export async function recall_makima_memory(
  { content, memory_space }: { content: string; memory_space?: string },
  context?: ContextType
) {
  memory_space = memory_space || "makima";
  const embeddings = new OpenAIEmbeddings({
    configuration: {
      fetch: (url, init) => fetch(url, { ...init, signal: context?.signal }),
    },
  });
  const embeddingsDirectory = `${makima_config.env.memory_dir}/embeddings/${memory_space}`;
  const exists = await fs.exists(`${embeddingsDirectory}/docstore.json`);

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

export async function forget_makima_memory(
  { content }: { content: string },
  context?: ContextType
) {
  const embeddings = new OpenAIEmbeddings({
    configuration: {
      fetch: (url, init) => fetch(url, { ...init, signal: context?.signal }),
    },
  });
  const embeddingsDirectory = `${makima_config.env.working_dir}${
    makima_config.env.working_dir
  }/${"makima"}`;
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

export async function forget_memory_space(
  { memory_space }: { memory_space: string },
  context?: ContextType
) {
  const embeddingsDirectory = `${makima_config.env.memory_dir}/embeddings/${memory_space}`;
  const exists = await fs.exists(`${embeddingsDirectory}/docstore.json`);

  if (!exists) {
    return "This memory space is already empty";
  }

  try {
    await fs.rm(embeddingsDirectory, { recursive: true });
    active_memory_spaces = active_memory_spaces.filter(
      (s) => s.id !== embeddingsDirectory
    );
    notifyChannel(`Memory forgotten: ${memory_space}`);
    return "Memory space cleared";
  } catch (error) {
    notifyChannel(`Error forgetting memory: ${error}`);
    console.log("Error forgetting memory:", error);
    return `Error forgetting memory: ${error}`;
  }
}
