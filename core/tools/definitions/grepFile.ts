import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const grepFileTool: Tool = {
  type: "function",
  displayTitle: "Grep File Lines",
  wouldLikeTo: "{{{ filepath }}}内で'{{{ pattern }}}'を検索します",
  isCurrently: "{{{ filepath }}}内で'{{{ pattern }}}'を検索中",
  hasAlready: "{{{ filepath }}}内で'{{{ pattern }}}'を検索しました",
  readonly: true,
  isInstant: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.GrepFile,
    description:
      "指定されたファイル内で正規表現を検索し、一致した行の行番号のみを返します。該当の内容周辺を読みたいとき、このツールで行番号を取得します。",
    parameters: {
      type: "object",
      required: ["filepath", "pattern"],
      properties: {
        filepath: {
          type: "string",
          description: "検索対象のファイルのパス。",
        },
        pattern: {
          type: "string",
          description: "検索する正規表現パターン。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `ファイル内で正規表現に一致する行番号の一覧を得るには、${BuiltInToolNames.GrepFile} ツールを使用してください。例:`,
    exampleArgs: [
      ["filepath", "path/to/the_file.ts"],
      ["pattern", "functionName"],
    ],
  },
  toolCallIcon: "MagnifyingGlassIcon",
};
