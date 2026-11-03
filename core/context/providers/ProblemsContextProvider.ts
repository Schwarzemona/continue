import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
} from "../../index.js";
import { isSecurityConcern } from "../../indexing/ignore.js";
import { getUriDescription } from "../../util/uri.js";
import { BaseContextProvider } from "../index.js";

class ProblemsContextProvider extends BaseContextProvider {
  static description: ContextProviderDescription = {
    title: "problems",
    displayTitle: "問題",
    description: "現在のファイル内の問題を参照",
    type: "normal",
  };

  async getContextItems(
    query: string,
    extras: ContextProviderExtras,
  ): Promise<ContextItem[]> {
    const ide = extras.ide;
    const problems = await ide.getProblems();
    const workspaceDirs = await ide.getWorkspaceDirs();

    const items = await Promise.all(
      problems.map(async (problem) => {
        const { relativePathOrBasename, baseName } = getUriDescription(
          problem.filepath,
          workspaceDirs,
        );
        const content = await ide.readFile(problem.filepath);
        const lines = content.split("\n");
        const rangeContent = lines
          .slice(
            Math.max(0, problem.range.start.line - 2),
            problem.range.end.line + 2,
          )
          .join("\n");

        return {
          description: "現在のファイル内の問題",
          content: `\`\`\`${relativePathOrBasename}\n${rangeContent}\n\`\`\`\n${problem.message}\n\n`,
          name: `${baseName} 内の警告`,
        };
      }),
    );

    return items.length === 0
      ? [
          {
            description: "現在のファイル内の問題",
            content: "開いているファイルに問題は見つかりませんでした。",
            name: "問題は見つかりませんでした",
          },
        ]
      : items;
  }
}

export default ProblemsContextProvider;
