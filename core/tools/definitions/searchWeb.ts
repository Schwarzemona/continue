import { Tool } from "../..";

import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const searchWebTool: Tool = {
  type: "function",
  displayTitle: "Search Web",
  wouldLikeTo: '"{{{ query }}}"をウェブ検索します',
  isCurrently: '"{{{ query }}}"をウェブ検索中',
  hasAlready: '"{{{ query }}}"をウェブ検索',
  readonly: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.SearchWeb,
    description: "ウェブ検索結果を返します。",
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "自然言語による検索クエリ。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `ウェブを検索するには、自然言語のクエリを使用して ${BuiltInToolNames.SearchWeb} ツールを使用してください。例えば、現在の天気を検索するには、次のように応答します:`,
    exampleArgs: [["query", "What is the current weather in San Francisco?"]],
  },
  toolCallIcon: "GlobeAltIcon",
};
