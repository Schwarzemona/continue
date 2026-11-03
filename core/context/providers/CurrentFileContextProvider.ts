import { BaseContextProvider } from "../";
import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
} from "../../";
import { getUriDescription } from "../../util/uri";

class CurrentFileContextProvider extends BaseContextProvider {
  static description: ContextProviderDescription = {
    title: "currentFile",
    displayTitle: "現在のファイル",
    description: "現在開いているファイルを参照する",
    type: "normal",
    renderInlineAs: "",
  };

  async getContextItems(
    query: string,
    extras: ContextProviderExtras,
  ): Promise<ContextItem[]> {
    const currentFile = await extras.ide.getCurrentFile();
    if (!currentFile) {
      return [];
    }

    const { relativePathOrBasename, last2Parts, baseName } = getUriDescription(
      currentFile.path,
      await extras.ide.getWorkspaceDirs(),
    );

    let prefix = "これは現在開いているファイルです:";
    let name = baseName;

    // This allows frontend to retrieve when using alt + enter or default context with slightly different copy
    if (query === "non-mention-usage") {
      prefix =
        "以下のファイルが現在開いています。ユーザーのメッセージに関連していない場合は参照しないでください:";
      name = "アクティブなファイル: " + baseName;
    }

    return [
      {
        description: last2Parts,
        content: `${prefix}\n\n\`\`\`${relativePathOrBasename}\n${currentFile.contents}\n\`\`\``,
        name,
        uri: {
          type: "file",
          value: currentFile.path,
        },
      },
    ];
  }
}

export default CurrentFileContextProvider;
