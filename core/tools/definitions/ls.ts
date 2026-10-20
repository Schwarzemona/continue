import { Tool } from "../..";

import { ToolPolicy } from "@continuedev/terminal-security";
import { ResolvedPath, resolveInputPath } from "../../util/pathResolver";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";
import { evaluateFileAccessPolicy } from "../policies/fileAccess";

export const lsTool: Tool = {
  type: "function",
  displayTitle: "ls",
  wouldLikeTo: "{{{ dirPath }}}内を確認します",
  isCurrently: "{{{ dirPath }}}内を確認中",
  hasAlready: "{{{ dirPath }}}内を確認",
  readonly: true,
  isInstant: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.LSTool,
    description:
      "指定されたディレクトリ内のファイルとフォルダの一覧を返します。",
    parameters: {
      type: "object",
      properties: {
        dirPath: {
          type: "string",
          description:
            "ディレクトリのパス。プロジェクトルートからの相対パス、絶対パス、チルダパス(~/...)、またはfile://URIが指定できます。スラッシュ(/)を使用したパスを指定します。",
        },
        recursive: {
          type: "boolean",
          description:
            "true の場合、ファイルとフォルダを再帰的に一覧表示します。予期しない大量の結果を防ぐため、使用は控えめにします。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `To list files and folders in a given directory, call the ${BuiltInToolNames.LSTool} tool with "dirPath" and "recursive". For example:`,
    exampleArgs: [
      ["dirPath", "path/to/dir"],
      ["recursive", "false"],
    ],
  },
  toolCallIcon: "FolderIcon",
  preprocessArgs: async (args, { ide }) => {
    const dirPath = args.dirPath as string;

    // Default to current directory if no path provided
    const pathToResolve = dirPath || ".";
    const resolvedPath = await resolveInputPath(ide, pathToResolve);

    return {
      resolvedPath,
    };
  },
  evaluateToolCallPolicy: (
    basePolicy: ToolPolicy,
    _: Record<string, unknown>,
    processedArgs?: Record<string, unknown>,
  ): ToolPolicy => {
    const resolvedPath = processedArgs?.resolvedPath as
      | ResolvedPath
      | null
      | undefined;
    if (!resolvedPath) return basePolicy;

    return evaluateFileAccessPolicy(basePolicy, resolvedPath.isWithinWorkspace);
  },
};
