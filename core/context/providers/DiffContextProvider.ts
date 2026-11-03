import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
} from "../../index.js";
import { BaseContextProvider } from "../index.js";

class DiffContextProvider extends BaseContextProvider {
  static description: ContextProviderDescription = {
    title: "diff",
    displayTitle: "Git Diff",
    description: "現在の Git Diff を参照",
    type: "normal",
  };

  async getContextItems(
    query: string,
    extras: ContextProviderExtras,
  ): Promise<ContextItem[]> {
    const includeUnstaged = this.options?.includeUnstaged ?? true;
    const diffs = await extras.ide.getDiff(includeUnstaged); // TODO use diff cache (currently cache always includes unstaged)
    return [
      {
        description: "現在の Git Diff",
        content:
          diffs.length === 0
            ? "現在、Git に変更はありません。"
            : `\`\`\`git diff\n${diffs.join("\n")}\n\`\`\``,
        name: "Git Diff",
      },
    ];
  }
}

export default DiffContextProvider;
