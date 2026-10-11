import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const codebaseTool: Tool = {
  type: "function",
  displayTitle: "Codebase Search",
  wouldLikeTo: "{{{ query }}}をコードベースから検索します",
  isCurrently: "{{{ query }}}をコードベースから検索中",
  hasAlready: "{{{ query }}}をコードベースから検索",
  readonly: true,
  isInstant: false,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.CodebaseTool,
    description:
      "自然言語のクエリに基づいて関連するコードスニペットを取得します。",
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description:
            "コードベース内で探しているものの自然言語による説明(例: 「認証ロジック」、「データベース接続の設定」、「エラーハンドリング」)。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithPermission",
  systemMessageDescription: {
    prefix: `To search the codebase, use the ${BuiltInToolNames.CodebaseTool} tool with a natural language query. For example, to find authentication logic, you might respond with:`,
    exampleArgs: [
      ["query", "How is user authentication handled in this codebase?"],
    ],
  },
};
