import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const grepSearchTool: Tool = {
  type: "function",
  displayTitle: "Grep Search",
  wouldLikeTo: '"{{{ query }}}"を検索します',
  isCurrently: '"{{{ query }}}"を検索中',
  hasAlready: '"{{{ query }}}"を検索',
  readonly: true,
  isInstant: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.GrepSearch,
    description:
      "プロジェクト内のファイル内容に対して正規表現で検索し、ファイル名を返します。出力が切り詰められることがあるため、対象を絞ったパターンを使用します。",
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "検索する正規表現パターン。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `プロジェクト内で grep 検索を実行するには、一致するクエリパターンを指定して ${BuiltInToolNames.GrepSearch} ツールを呼び出してください。例:`,
    exampleArgs: [["query", ".*main_services.*"]],
  },
  toolCallIcon: "MagnifyingGlassIcon",
};
