import { ToolPolicy } from "@continuedev/terminal-security";
import { Tool } from "../..";
import { ResolvedPath, resolveInputPath } from "../../util/pathResolver";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";
import { evaluateFileAccessPolicy } from "../policies/fileAccess";

export const readFileRangeTool: Tool = {
  type: "function",
  displayTitle: "Read File Range",
  wouldLikeTo:
    "{{{ filepath }}}の{{{ startLine }}}-{{{ endLine }}}行目を読み込みます",
  isCurrently:
    "{{{ filepath }}}の{{{ startLine }}}-{{{ endLine }}}行目を読み込み中",
  hasAlready:
    "{{{ filepath }}}の{{{ startLine }}}-{{{ endLine }}}行目を読み込み",
  readonly: true,
  isInstant: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.ReadFileRange,
    description:
      "既存のファイルから100行以内の範囲を読み取るために使用します。",
    parameters: {
      type: "object",
      required: ["filepath", "startLine", "endLine"],
      properties: {
        filepath: {
          type: "string",
          description:
            "読み込むファイルのパス。ワークスペースのルートからの相対パス(uriと絶対パスは使用できません)。",
        },
        startLine: {
          type: "number",
          description:
            "開始行番号(開始からの1始まり)。正の整数である必要があります。例: 1 = 1行目、10 = 10行目。",
        },
        endLine: {
          type: "number",
          description:
            "終了行番号(開始からの1始まり)。startLine以上の正の整数である必要があります。例: 10 = 10行目, 20 = 20行目。",
        },
      },
    },
  },
  systemMessageDescription: {
    prefix: `To read a specific range of lines from a file, use the ${BuiltInToolNames.ReadFileRange} tool. Only supports positive line numbers (1-based from start). For reading from the end of files, use the terminal tool with 'tail' command instead:`,
    exampleArgs: [
      ["filepath", "path/to/the_file.txt"],
      ["startLine", 10],
      ["endLine", 20],
    ],
  },
  defaultToolPolicy: "allowedWithoutPermission",
  toolCallIcon: "DocumentIcon",
  preprocessArgs: async (args, { ide }) => {
    const filepath = args.filepath as string;
    const resolvedPath = await resolveInputPath(ide, filepath);

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
