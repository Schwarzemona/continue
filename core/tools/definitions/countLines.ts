import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const countLinesTool: Tool = {
  type: "function",
  displayTitle: "Count File Lines",
  wouldLikeTo: "{{{ filepath }}}の行数を取得します",
  isCurrently: "{{{ filepath }}}の行数を取得中",
  hasAlready: "{{{ filepath }}}の行数を取得しました",
  readonly: true,
  isInstant: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.CountLines,
    description:
      "指定されたファイルの総行数を返します。ファイル末尾の行数を知りたいとき、このツールで総行数を取得します。",
    parameters: {
      type: "object",
      required: ["filepath"],
      properties: {
        filepath: {
          type: "string",
          description: "行数を取得するファイルのパス。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `ファイルの総行数を知るには、${BuiltInToolNames.CountLines} ツールを使用してください。例:`,
    exampleArgs: [["filepath", "path/to/the_file.ts"]],
  },
  toolCallIcon: "ListOrderedIcon",
};
