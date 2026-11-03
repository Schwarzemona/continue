import { ToolImpl } from ".";
import { RangeInFile } from "../..";
import { retrieveContextItemsFromEmbeddings } from "../../context/retrieval/retrieval";
import { getStringArg } from "../parseArgs";

export const codebaseToolImpl: ToolImpl = async (args, extras) => {
  const query = getStringArg(args, "query");

  try {
    const contextExtras = {
      config: extras.config,
      fullInput: query,
      embeddingsProvider: extras.config.selectedModelByRole.embed,
      reranker: extras.config.selectedModelByRole.rerank,
      llm: extras.llm,
      ide: extras.ide,
      selectedCode: [] as RangeInFile[],
      fetch: extras.fetch,
      isInAgentMode: true, // always true in tool call
    };

    // Use the existing retrieval function to get context items
    const results = await retrieveContextItemsFromEmbeddings(
      contextExtras,
      undefined,
      undefined,
    );

    // If no results found, return helpful message
    if (results.length === 0) {
      return [
        {
          name: "結果なし",
          description: "コードベース検索",
          content: `クエリ「${query}」に関連ファイルが見つかりませんでした`,
        },
      ];
    }

    return results;
  } catch (error) {
    return [
      {
        name: "エラー",
        description: "コードベース検索エラー",
        content: `コードベースの検索に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      },
    ];
  }
};
