import { $ } from "zx";
import { setup_discord } from "./interfaces/discord";
import { testOpenAI } from "./lib/openai";

console.log("starting makima");
await setup_discord();
testOpenAI();
