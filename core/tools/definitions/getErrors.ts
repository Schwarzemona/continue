import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const getErrorsTool: Tool = {
  type: "function",
  displayTitle: "Get Errors",
  wouldLikeTo: "{{{ filepath }}}のエラーを取得します",
  isCurrently: "{{{ filepath }}}のエラーを取得中",
  hasAlready: "{{{ filepath }}}のエラーを取得しました",
  readonly: true,
  isInstant: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.GetErrors,
    description:
      "IDEのProblems(型エラー・lintエラーなど)を取得します。filepathを省略するとアクティブエディタが対象になります。",
    parameters: {
      type: "object",
      properties: {
        filepath: {
          type: "string",
          description:
            "エラーを取得するファイルのパス。省略した場合はアクティブエディタが対象です。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `ファイルの型エラーやlintエラーを取得するには、${BuiltInToolNames.GetErrors} ツールを使用してください。filepathを省略するとアクティブエディタが対象になります。例:`,
    exampleArgs: [["filepath", "path/to/the_file.ts"]],
  },
  toolCallIcon: "ExclamationTriangleIcon",
};
