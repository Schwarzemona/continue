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
      "自然言語のクエリに基づいて関連するコードスニペットを返します。",
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description:
            "コードベース内で検索する自然言語(例: 「認証ロジック」、「データベース接続の設定」、「エラーハンドリング」)。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithPermission",
  systemMessageDescription: {
    prefix: `コードベースを検索するには、自然言語のクエリを使用して ${BuiltInToolNames.CodebaseTool} ツールを使用してください。例えば、認証ロジックを見つけるには、次のように応答します:`,
    exampleArgs: [
      ["query", "How is user authentication handled in this codebase?"],
    ],
  },
};
