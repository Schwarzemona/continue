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
      "ripgrepを使用してリポジトリ全体のファイル内容に対して正規表現で検索し、結果をファイル名と行数で返します。",
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "ファイル内容で検索する正規表現パターン。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `To perform a grep search within the project, call the ${BuiltInToolNames.GrepSearch} tool with the query pattern to match. For example:`,
    exampleArgs: [["query", ".*main_services.*"]],
  },
  toolCallIcon: "MagnifyingGlassIcon",
};
