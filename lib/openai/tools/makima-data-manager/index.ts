import { notifyChannel } from "@/interfaces/discord";
import { ContextType } from "../..";
import { OllamaEmbeddings } from "langchain/embeddings/ollama";
import { FaissStore } from "langchain/vectorstores/faiss";
import { fs } from "zx";
import { Document } from "langchain/document";
const embeddings = new OllamaEmbeddings({ model: "mistral" });

export async function save_makima_memory(
  { content }: { content: string },
  context?: ContextType
) {
  const memory_space = "makima";

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
          pageContent: content,
          metadata: { id },
        }),
      ],
      { ids: [id] }
    );
    await tmp.save(embeddingsDirectory);
    console.log("This is a new user, saved:", content, "to memory");
    return "This is a new user, saved: " + content + " to memory";
  }

  notifyChannel(`Loading from space: ${memory_space}`);
  const vectorStore = await FaissStore.load(embeddingsDirectory, embeddings);

  try {
    const id = String(
      context?.meta ? JSON.stringify(context.meta) : Math.random()
    );
    const ids = await vectorStore.addDocuments(
      [
        new Document({
          pageContent: content,
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
  { content }: { content: string },
  context?: ContextType
) {
  const memory_space = "makima";
  const embeddingsDirectory = `/home/makima/makima_memory/embeddings/${memory_space}`;
  const exists = await fs.exists(`${embeddingsDirectory}/docstore.json`);

  if (!exists) {
    notifyChannel(`New memory space: ${memory_space}`);
    console.log("This is a new user, no memories saved yet");
    return "This is a new user, no memories saved yet";
  }

  const vectorStore = await FaissStore.load(embeddingsDirectory, embeddings);

  notifyChannel(`Loading from space: ${memory_space}`);
  const resultOne = await vectorStore.similaritySearch(content, 1);
  notifyChannel(`Found from space: ${resultOne[0].pageContent}`);
  console.log(resultOne);
  return `found from memory: ${
    resultOne[0].pageContent
  }\nmeta_data:${JSON.stringify(resultOne[0].metadata)}`;
}

export async function forget_makima_memory(
  { content }: { content: string },
  context?: ContextType
) {
  const embeddingsDirectory = `/home/makima/makima_memory/embeddings/${"makima"}`;
  const exists = await fs.exists(`${embeddingsDirectory}/docstore.json`);

  if (!exists) {
    console.log("This is a new user, no memories saved yet");
    return "This is a new user, no memories saved yet";
  }

  try {
    const vectorStore = await FaissStore.load(embeddingsDirectory, embeddings);

    const resultOne = await vectorStore.similaritySearch(content, 1);

    await vectorStore.delete({
      ids: resultOne.map((d) => d.metadata.id || String(d.metadata)),
    });
    notifyChannel(`Memory forgotten: ${resultOne[0].pageContent}`);
    console.log("Memory forgotten");
    return "Memory forgotten";
  } catch (error) {
    notifyChannel(`Error forgetting memory: ${error}`);
    console.log("Error forgetting memory:", error);
    return `Error forgetting memory: ${error}`;
  }
}
