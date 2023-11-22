import { OllamaEmbeddings } from "langchain/embeddings/ollama";
import { FaissStore } from "langchain/vectorstores/faiss";
import fs from "fs/promises";

const embeddings = new OllamaEmbeddings({ model: "orca-mini" });

const embeddingsDirectory = `testembeddings`;
const exists = await fs.exists(`${embeddingsDirectory}/args.json`);

if (!exists) {
  const tmp = await FaissStore.fromDocuments(
    [
      { pageContent: "important number is 42", metadata: { id: "1" } },
      { pageContent: "unimportant number is 43", metadata: { id: "2" } },
      { pageContent: "very very useless number is 43", metadata: { id: "3" } },
    ],
    embeddings
  );
  await tmp.save(embeddingsDirectory);
}

const vectorStore = await FaissStore.load(embeddingsDirectory, embeddings);

const resultOne = await vectorStore.similaritySearch("important number", 1);

console.log(resultOne);

// forget
// vectorStore.delete({ id: resultOne[0].metadata.id });
