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
    prefix: `To search the web, use the ${BuiltInToolNames.SearchWeb} tool with a natural language query. For example, to search for the current weather, you would respond with:`,
    exampleArgs: [["query", "What is the current weather in San Francisco?"]],
  },
  toolCallIcon: "GlobeAltIcon",
};
