import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
} from "../../index.js";
import { isSecurityConcern } from "../../indexing/ignore.js";
import { getUriDescription } from "../../util/uri.js";
import { BaseContextProvider } from "../index.js";

class OpenFilesContextProvider extends BaseContextProvider {
  static description: ContextProviderDescription = {
    title: "open",
    displayTitle: "開いているファイル",
    description: "現在開いているファイルを参照",
    type: "normal",
    renderInlineAs: "",
  };

  async getContextItems(
    query: string,
    extras: ContextProviderExtras,
  ): Promise<ContextItem[]> {
    const ide = extras.ide;
    const openFiles = this.options?.onlyPinned
      ? await ide.getPinnedFiles()
      : await ide.getOpenFiles();
    const workspaceDirs = await extras.ide.getWorkspaceDirs();

    return await Promise.all(
      openFiles.map(async (filepath: string) => {
        const { relativePathOrBasename, last2Parts, baseName } =
          getUriDescription(filepath, workspaceDirs);

        if (isSecurityConcern(filepath)) {
          return {
            description: last2Parts,
            content:
              "セキュリティ上の理由により、このファイルの内容は閲覧できません。",
            name: baseName,
            uri: {
              type: "file",
              value: filepath,
            },
          };
        }
        const content = await ide.readFile(filepath);

        return {
          description: last2Parts,
          content: `\`\`\`${relativePathOrBasename}\n${content}\n\`\`\``,
          name: baseName,
          uri: {
            type: "file",
            value: filepath,
          },
        };
      }),
    );
  }
}

export default OpenFilesContextProvider;
