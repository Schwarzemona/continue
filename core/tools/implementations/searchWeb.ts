import { ToolImpl } from ".";
import { fetchSearchResults } from "../../context/providers/WebContextProvider";
import { getStringArg } from "../parseArgs";

const DEFAULT_WEB_SEARCH_CHAR_LIMIT = 8000;

export const searchWebImpl: ToolImpl = async (args, extras) => {
  const query = getStringArg(args, "query");

  const webResults = await fetchSearchResults(query, 5, extras.fetch);

  // Track truncated results
  const truncatedResults: string[] = [];

  // Check and truncate each result
  const processedResults = webResults.map((result, index) => {
    if (result.content.length > DEFAULT_WEB_SEARCH_CHAR_LIMIT) {
      truncatedResults.push(
        result.name || result.description || `Result #${index + 1}`,
      );
      return {
        ...result,
        content: result.content.substring(0, DEFAULT_WEB_SEARCH_CHAR_LIMIT),
      };
    }
    return result;
  });

  // Add truncation warning if needed
  if (truncatedResults.length > 0) {
    processedResults.push({
      name: "切り詰め警告",
      description: "",
      content: `以下の検索結果は、${DEFAULT_WEB_SEARCH_CHAR_LIMIT}文字の制限を超えたため切り詰められました: ${truncatedResults.join("、")}`,
    });
  }

  return processedResults;
};
