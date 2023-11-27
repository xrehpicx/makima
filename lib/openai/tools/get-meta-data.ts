import metaFetcher from "meta-fetcher";
import { YAML } from "zx";

export async function get_link_meta_data({ link }: { link: string }) {
  //   const res = await fetch(`https://api.microlink.io/?url=${link}`);
  //   const json = await res.json();
  //   return json;
  const result = await metaFetcher(link);
  console.log(result);
  return YAML.stringify(result);
}
