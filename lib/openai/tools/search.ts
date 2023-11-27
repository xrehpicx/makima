import { makima_config } from "@/config";
import { getJson } from "serpapi";
import { ContextType } from "..";

export async function search(
  {
    query,
    type = "organic_results",
  }: {
    query: string;
    type:
      | "news_results"
      | "organic_results"
      | "local_results"
      | "knowledge_graph"
      | "recipes_results"
      | "shopping_results"
      | "jobs_results"
      | "inline_videos"
      | "inline_images";
  },
  context?: ContextType
) {
  const res = await getJson({
    q: query,
    api_key: makima_config.agents.search_api_key,
  });

  if (res[type]) {
    return res[type];
  }
  return `could not find ${type} in search results, try a different type`;
}
