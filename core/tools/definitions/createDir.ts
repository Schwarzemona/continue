import { ToolPolicy } from "@continuedev/terminal-security";
import { Tool } from "../..";
import { ResolvedPath, resolveInputPath } from "../../util/pathResolver";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";
import { evaluateFileAccessPolicy } from "../policies/fileAccess";

export const createDirTool: Tool = {
  type: "function",
  displayTitle: "Create Directory",
  wouldLikeTo: "{{{ dirpath }}}を作成します",
  isCurrently: "{{{ dirpath }}}を作成中",
  hasAlready: "{{{ dirpath }}}を作成しました",
  group: BUILT_IN_GROUP_NAME,
  readonly: false,
  isInstant: true,
  function: {
    name: BuiltInToolNames.CreateDir,
    description: "新しいディレクトリを作成します。",
    parameters: {
      type: "object",
      required: ["dirpath"],
      properties: {
        dirpath: {
          type: "string",
          description:
            "作成するディレクトリのパス。プロジェクトルートからの相対パス、絶対パス、チルダパス(~/...)、またはfile://URIが指定できます。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `新しいディレクトリを作成するには、${BuiltInToolNames.CreateDir} ツールを使用してください。例:`,
    exampleArgs: [["dirpath", "path/to/the_new_dir"]],
  },
  toolCallIcon: "FolderPlusIcon",
  preprocessArgs: async (args, { ide }) => {
    const resolvedPath = await resolveInputPath(ide, args.dirpath as string);
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
