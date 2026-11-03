import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
} from "../../index.js";
import { BaseContextProvider } from "../index.js";

class GoogleContextProvider extends BaseContextProvider {
  static description: ContextProviderDescription = {
    title: "google",
    displayTitle: "Google",
    description: "Google 検索結果を追加",
    type: "query",
  };

  private _serperApiKey: string;

  constructor(options: { serperApiKey: string }) {
    super(options);
    this._serperApiKey = options.serperApiKey;
  }

  get deprecationMessage() {
    return "Google コンテキストプロバイダーは非推奨になりました。代わりに github.com/jae-jae/g-search-mcp の使用を検討してください。";
  }

  async getContextItems(
    query: string,
    extras: ContextProviderExtras,
  ): Promise<ContextItem[]> {
    const url = "https://google.serper.dev/search";

    const payload = JSON.stringify({ q: query });
    const headers = {
      "X-API-KEY": this._serperApiKey,
      "Content-Type": "application/json",
    };

    const response = await extras.fetch(url, {
      method: "POST",
      headers: headers,
      body: payload,
    });

    if (!response.ok) {
      throw new Error(
        `Google 検索結果の取得に失敗しました: ${response.statusText}`,
      );
    }
    const results = await response.text();
    try {
      const parsed = JSON.parse(results);
      let content = `Google 検索: ${query}\n\n`;
      const answerBox = parsed.answerBox;

      if (answerBox) {
        content += `Answer Box (${answerBox.title}): ${answerBox.answer}\n\n`;
      }

      for (const result of parsed.organic) {
        content += `${result.title}\n${result.link}\n${result.snippet}\n\n`;
      }

      return [
        {
          content,
          name: "Google 検索",
          description: "Google 検索",
        },
      ];
    } catch (e) {
      throw new Error(`Google 検索結果の解析に失敗しました: ${results}`);
    }
  }
}

export default GoogleContextProvider;
