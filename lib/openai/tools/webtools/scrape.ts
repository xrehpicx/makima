import { ContextType } from "../..";
import { HtmlToTextTransformer } from "langchain/document_transformers/html_to_text";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";

const transformer = new HtmlToTextTransformer();

var document: any;
export async function webscrape(
  { url }: { url: string },
  context?: ContextType
) {
  const loader = new CheerioWebBaseLoader(url);
  try {
    const docs = await loader.load();

    const text_version = await transformer.transformDocuments(docs);

    return text_version[0].pageContent;
  } catch (error) {
    console.error(error);
    return error;
  }
}
