import { encode } from "gpt-tokenizer";

import { Ollama } from "langchain/llms/ollama";
import { YoutubeLoader } from "langchain/document_loaders/web/youtube";
const loader = YoutubeLoader.createFromUrl("https://youtu.be/bZQun8Y4L2A", {
  language: "en",
  addVideoInfo: true,
});
const ollama = new Ollama({
  model: "llama2-uncensored:7b-chat-q2_K",
});

const docs = await loader.load();

console.log("fetched");
// Streaming translation from English to German
const stream = await ollama.stream(
  `Summarize the below:\n ${docs[0].pageContent}`
);

const chunks = [];
for await (const chunk of stream) {
  process.stdout.write(chunk);
}

console.log("done");

const op = encode(docs[0].pageContent, {});
console.log(op.length);
