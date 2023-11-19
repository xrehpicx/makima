import { $ } from "zx";
import { setup_discord } from "./interfaces/discord";
import { testOpenAI } from "./lib/openai";

console.log("starting makima");
testOpenAI();
await setup_discord();

try {
 $`ls`;
} catch (error) {
 console.log("Error: ", error);
}