import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import OpenAI from "openai";
import { ContextType } from "../openai";
import { makima_config } from "@/config";
import { nanoid } from "nanoid";
import { FaissStore } from "langchain/vectorstores/faiss";
import { Document } from "langchain/document";
import fs from "fs/promises";
import { YAML } from "zx";

export async function save_feedback(
  {
    feedback,
  }: {
    feedback: string;
  },
  context?: ContextType
) {
  const embeddings = new OpenAIEmbeddings({
    configuration: {
      fetch: (url, init) => fetch(url, { ...init, signal: context?.signal }),
    },
  });
  const memory_space = `feedbacks-${context?.user}`;
  const embeddingsDirectory = `${makima_config.env.memory_dir}/embeddings/${memory_space}`;

  const exists = await fs.exists(`${embeddingsDirectory}/docstore.json`);

  try {
    if (!exists) {
      const tmp = await FaissStore.fromDocuments([], embeddings);
      const id = String(nanoid());

      await tmp.addDocuments(
        [
          new Document({
            pageContent: `
                      ${feedback}
                      timestamp: ${Date.now()}`,
            metadata: { id },
          }),
        ],
        { ids: [id] }
      );
      await tmp.save(embeddingsDirectory);
    }

    const id = String(nanoid());
    const store = await FaissStore.load(embeddingsDirectory, embeddings);

    await store.addDocuments(
      [
        new Document({
          pageContent: `
        ${feedback}
        timestamp: ${Date.now()}`,
          metadata: { id },
        }),
      ],
      { ids: [id] }
    );
    await store.save(embeddingsDirectory);
    return "saved feedback";
  } catch (error) {
    console.log(error);
    return "error saving feedback: " + error;
  }
}

export async function get_examples_from_feedback(
  { query }: { query: string },
  context?: ContextType
) {
  const embeddings = new OpenAIEmbeddings({
    configuration: {
      fetch: (url, init) => fetch(url, { ...init, signal: context?.signal }),
    },
  });
  const memory_space = `feedbacks-${context?.user}`;
  const embeddingsDirectory = `${makima_config.env.memory_dir}/embeddings/${memory_space}`;

  const exists = await fs.exists(`${embeddingsDirectory}/docstore.json`);

  if (!exists) {
    return "no feedbacks found";
  }

  const store = await FaissStore.load(embeddingsDirectory, embeddings);

  const results = await store.similaritySearchWithScore(query);

  return YAML.stringify(
    results.map(([result, score]) => {
      return {
        content: result.pageContent,
        match_score: score,
      };
    })
  );
}
