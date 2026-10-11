import { ToolPolicy } from "@continuedev/terminal-security";
import { Tool } from "../..";
import { ResolvedPath, resolveInputPath } from "../../util/pathResolver";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";
import { evaluateFileAccessPolicy } from "../policies/fileAccess";

export const createNewFileTool: Tool = {
  type: "function",
  displayTitle: "Create New File",
  wouldLikeTo: "{{{ filepath }}}を作成します",
  isCurrently: "{{{ filepath }}}を作成中",
  hasAlready: "{{{ filepath }}}を作成",
  group: BUILT_IN_GROUP_NAME,
  readonly: false,
  isInstant: true,
  function: {
    name: BuiltInToolNames.CreateNewFile,
    description: "新しいファイルを作成します。上書きはできません。",
    parameters: {
      type: "object",
      required: ["filepath", "contents"],
      properties: {
        filepath: {
          type: "string",
          description: "新しいファイルを作成するパス。",
        },
        contents: {
          type: "string",
          description:
            "新しいファイルに書き込む内容。プロジェクトルートからの相対パス、絶対パス、チルダパス(~/...)、またはfile://URIが指定できます。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithPermission",
  systemMessageDescription: {
    prefix: `To create a NEW file, use the ${BuiltInToolNames.CreateNewFile} tool with the relative filepath and new contents. For example, to create a file located at 'path/to/file.txt', you would respond with:`,
    exampleArgs: [
      ["filepath", "path/to/the_file.txt"],
      ["contents", "Contents of the file"],
    ],
  },
  preprocessArgs: async (args, { ide }) => {
    const filepath = args.filepath as string;
    const resolvedPath = await resolveInputPath(ide, filepath);

    // Store the resolved path info in args for policy evaluation
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
