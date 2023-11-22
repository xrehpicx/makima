import { YoutubeLoader } from "langchain/document_loaders/web/youtube";
import { ContextType } from "../..";

export async function get_youtube_video_data(
  { url }: { url: string },
  context?: ContextType
) {
  const loader = YoutubeLoader.createFromUrl(url, {
    language: "en",
    addVideoInfo: true,
  });

  try {
    const docs = await loader.load();
    return docs[0];
  } catch (error) {
    console.error(error);
    return error;
  }
}
