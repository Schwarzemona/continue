import { ToolPolicy } from "@continuedev/terminal-security";
import { Tool } from "../..";
import { ResolvedPath, resolveInputPath } from "../../util/pathResolver";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";
import { evaluateFileAccessPolicy } from "../policies/fileAccess";

export const removeFileTool: Tool = {
  type: "function",
  displayTitle: "Remove File",
  wouldLikeTo: "{{{ filepath }}}を削除します",
  isCurrently: "{{{ filepath }}}を削除中",
  hasAlready: "{{{ filepath }}}を削除しました",
  group: BUILT_IN_GROUP_NAME,
  readonly: false,
  isInstant: true,
  function: {
    name: BuiltInToolNames.RemoveFile,
    description: "ファイルを削除します。ディレクトリは削除できません。",
    parameters: {
      type: "object",
      required: ["filepath"],
      properties: {
        filepath: {
          type: "string",
          description:
            "削除するファイルのパス。プロジェクトルートからの相対パス、絶対パス、チルダパス(~/...)、またはfile://URIが指定できます。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `ファイルを削除するには、${BuiltInToolNames.RemoveFile} ツールを使用してください。例:`,
    exampleArgs: [["filepath", "path/to/the_file.txt"]],
  },
  toolCallIcon: "TrashIcon",
  preprocessArgs: async (args, { ide }) => {
    const resolvedPath = await resolveInputPath(ide, args.filepath as string);
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
      ResolvedPath | null | undefined;
    if (!resolvedPath) return basePolicy;

    return evaluateFileAccessPolicy(basePolicy, resolvedPath.isWithinWorkspace);
  },
};
