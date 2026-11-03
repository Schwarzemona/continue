import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
} from "../../index.js";
import { formatGrepSearchResults } from "../../util/grepSearch.js";
import { BaseContextProvider } from "../index.js";

const DEFAULT_MAX_SEARCH_CONTEXT_RESULTS = 200;
class SearchContextProvider extends BaseContextProvider {
  static description: ContextProviderDescription = {
    title: "search",
    displayTitle: "検索",
    description: "ripgrepを使用してワークスペースを検索",
    type: "query",
    renderInlineAs: "",
  };

  async getContextItems(
    query: string,
    extras: ContextProviderExtras,
  ): Promise<ContextItem[]> {
    const results = await extras.ide.getSearchResults(
      query,
      this.options?.maxResults ?? DEFAULT_MAX_SEARCH_CONTEXT_RESULTS,
    );
    // Note, search context provider will not truncate result chars, but will limit number of results
    const { formatted } = formatGrepSearchResults(results);
    return [
      {
        description: "検索結果",
        content: `"${query}" のコードベース検索結果:\n\n${formatted}`,
        name: "検索結果",
      },
    ];
  }
}

export default SearchContextProvider;
