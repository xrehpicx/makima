import * as fs from "fs";
import * as path from "path";
import * as fuzz from "fuzzball";

export function minimizeTokens(inputString: string): string {
  let result = inputString.trim();

  // Remove redundant whitespace within tags (HTML/XML)
  result = result.replace(/>\s+</g, "><");

  // Remove redundant whitespace within parentheses
  result = result.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");

  // Replace consecutive spaces, tabs, and line breaks with a single space
  result = result.replace(/\s+/g, " ");

  // Collapse multiple consecutive line breaks into a single line break
  result = result.replace(/\n+/g, "\n");

  // Remove whitespace around operators
  result = result.replace(/\s*([+\-*/%=^])\s*/g, "$1");

  return result;
}

interface SearchResult {
  filePath: string;
  score: number;
}

export function fuzzySearchDirectory(
  searchTerm: string,
  directoryPath: string,
  pathQuery?: string
): string | null {
  let mostSimilarFile: SearchResult | null = null;

  // Validate the directory path
  if (
    !fs.existsSync(directoryPath) ||
    !fs.lstatSync(directoryPath).isDirectory()
  ) {
    throw new Error("Invalid directory path");
  }

  // Function to perform a fuzzy search
  function performSearch(
    term: string,
    currentPath: string
  ): SearchResult | null {
    let result: SearchResult | null = null;

    const files = fs.readdirSync(currentPath);

    files.forEach((file) => {
      const filePath = path.join(currentPath, file);

      // Check if the file is a directory
      if (fs.statSync(filePath).isDirectory()) {
        // Recursively perform search in subdirectory
        const subdirectoryResult = performSearch(term, filePath);

        // Update the most similar file if the score is higher
        if (
          subdirectoryResult &&
          (!result || subdirectoryResult.score > result.score)
        ) {
          result = subdirectoryResult;
        }
      } else {
        // Read the contents of the file
        const fileContent = fs.readFileSync(filePath, "utf-8");

        // Perform fuzzy search on the file content
        const score = fuzz.token_sort_ratio(fileContent, term);

        // Update the most similar file if the score is higher
        if (!result || score > result.score) {
          result = { filePath, score };
        }
      }
    });

    return result;
  }

  // Perform fuzzy search for searchTerm
  mostSimilarFile = performSearch(searchTerm, directoryPath);

  // If no result for searchTerm, perform search for pathQuery
  if (!mostSimilarFile && pathQuery) {
    mostSimilarFile = performSearch(pathQuery, directoryPath);
  }

  // If a similar file is found, return its contents
  if (mostSimilarFile) {
    const mostSimilarFilePath = mostSimilarFile.filePath;
    const mostSimilarFileContent = fs.readFileSync(
      mostSimilarFilePath,
      "utf-8"
    );
    return mostSimilarFileContent;
  }

  // Return null if no similar file is found
  return null;
}
