import { setup_discord } from "@/interfaces/discord";
import { testOpenAI } from "@/lib/openai";
import { init_telegram } from "./interfaces/telegram";

console.log("starting makima");
// testOpenAI();
setup_discord();
init_telegram();
