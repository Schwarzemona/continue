import { BaseContextProvider } from "../";
import {
  Chunk,
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
  ContextSubmenuItem,
  IDE,
  LoadSubmenuItemsArgs,
} from "../..";
import DocsService from "../../indexing/docs/DocsService";

import { INSTRUCTIONS_BASE_ITEM } from "./utils";

class DocsContextProvider extends BaseContextProvider {
  static nRetrieve = 30;
  static nFinal = 15;
  static description: ContextProviderDescription = {
    title: "docs",
    displayTitle: "ドキュメント",
    description: "入力して検索",
    type: "submenu",
    // Todo: consider a different renderInline so that when multiple docs are referenced in one message,
    // Or the doc has an odd name unrelated to the content
    // The name of the doc itself doesn't skew the embedding results
    renderInlineAs: "",
  };

  constructor(options: any) {
    super(options);
    const docsService = DocsService.getSingleton();
    docsService?.setGithubToken(this.options?.githubToken);
  }

  private async _rerankChunks(
    chunks: Chunk[],
    reranker: NonNullable<ContextProviderExtras["reranker"]>,
    fullInput: ContextProviderExtras["fullInput"],
    ide: IDE,
  ) {
    let chunksCopy = [...chunks];

    try {
      const scores = await reranker.rerank(fullInput, chunksCopy);

      if (Array.isArray(scores)) {
        // reranker model has returned a valid array
        chunksCopy.sort(
          (a, b) =>
            scores[chunksCopy.indexOf(b)] - scores[chunksCopy.indexOf(a)],
        );
      }

      chunksCopy = chunksCopy.splice(
        0,
        this.options?.nFinal ?? DocsContextProvider.nFinal,
      );
    } catch (e) {
      void ide.showToast("warning", `検索結果の再ランク付けに失敗しました\n${e}`);

      chunksCopy = chunksCopy.splice(
        0,
        this.options?.nFinal ?? DocsContextProvider.nFinal,
      );
    }

    return chunksCopy;
  }

  private _sortAlphabetically(
    submenuItems: ContextSubmenuItem[],
  ): ContextSubmenuItem[] {
    // Sort submenu items alphabetically by title
    return submenuItems.sort((a, b) => {
      return a.title.toString().localeCompare(b.title.toString());
    });
  }

  async getContextItems(
    query: string,
    extras: ContextProviderExtras,
  ): Promise<ContextItem[]> {
    const nRetrieve = this.options?.nRetrieve ?? DocsContextProvider.nRetrieve;
    const useReranking = this.options?.useReranking ?? true;

    // Get docs service
    const docsService = DocsService.getSingleton();
    if (!docsService) {
      console.error(`${DocsService.name}が初期化されていません`);
      return [];
    }
    await docsService.isInitialized;

    // Get chunks
    let chunks = await docsService.retrieveChunksFromQuery(
      extras.fullInput, // confusing: fullInput = the query, query = startUrl in this case
      query,
      nRetrieve,
    );
    if (!chunks?.length) {
      return [];
    }

    // We found chunks, so check if there's a favicon for the docs page
    const favicon = await docsService.getFavicon(query);

    // Rerank if there's a reranker
    if (useReranking && extras.reranker) {
      chunks = await this._rerankChunks(
        chunks,
        extras.reranker,
        extras.fullInput,
        extras.ide,
      );
    }

    return [
      ...chunks
        .map((chunk) => ({
          icon: favicon,
          name: chunk.filepath.includes("/tree/main") // For display of GitHub files
            ? chunk.filepath
                .split("/")
                .slice(1)
                .join("/")
                .split("/tree/main/")
                .slice(1)
                .join("/")
            : chunk.otherMetadata?.title || chunk.filepath,
          description: chunk.filepath,
          content: chunk.content,
          uri: {
            type: "url" as const,
            value: chunk.filepath,
          },
        }))
        .reverse(),
      {
        ...INSTRUCTIONS_BASE_ITEM,
        content:
          "上記のドキュメントを参照して、以下の質問に回答してください。" +
          "一般的に知られている概念を除き、提示された情報以外の資料は参照しないでください。" +
          "可能な限り、マークダウン形式を用いてURLを併記してください。" +
          "質問に回答するために必要な情報が不足している場合は、詳細を確認できる場所やリソースを提示してください。",
      },
    ];
  }

  async loadSubmenuItems(
    args: LoadSubmenuItemsArgs,
  ): Promise<ContextSubmenuItem[]> {
    const { config } = args;
    // This set is used to filter out the docs that is not in docs config but exist in sqlite metadata
    const configDocsSet = new Set(
      config.docs?.map((doc) => doc.startUrl) || [],
    );
    // Get docs service
    const docsService = DocsService.getSingleton();
    if (!docsService) {
      console.error(`${DocsService.name}が初期化されていません`);
      return [];
    }
    await docsService.isInitialized;

    // Create an array to hold submenu items
    const submenuItems: ContextSubmenuItem[] = [];

    // Get all indexed docs from the database
    const docs = (await docsService.listMetadata()) ?? [];
    for (const { startUrl, title, favicon } of docs) {
      if (configDocsSet.has(startUrl)) {
        submenuItems.push({
          title,
          id: startUrl,
          description: new URL(startUrl).hostname,
          icon: favicon,
        });
      }
    }

    // Sort alphabetically
    return this._sortAlphabetically(submenuItems);
  }
}

export default DocsContextProvider;
