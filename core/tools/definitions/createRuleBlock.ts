import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

const NAME_ARG_DESC = "ルール名。";
const RULE_ARG_DESC =
  "明確で命令的な指示。";
const DESC_ARG_DESC =
  "具体的で重要な用語を含む説明。使用すべきトリガー/コンテキストを含めます。";
const GLOB_ARG_DESC =
  "このルールが適用されるファイル名の正規表現パターン(例: ['**/*.{ts,tsx}'] または ['src/**/*.ts', 'tests/**/*.ts'])。";
const REGEX_ARG_DESC =
  "このルールが適用されるファイル内容の正規表現パターン(例: Reactフック用の'useEffect'やクラス定義用の'\\bclass\\b')。";
const ALWAYS_APPLY_DESC =
  "このルールを常に適用すべきかどうか。基本的にfalseに設定します。";

export const createRuleBlock: Tool = {
  type: "function",
  displayTitle: "Create Rule Block",
  wouldLikeTo: '"{{{ name }}}"のルールブロックを作成します',
  isCurrently: '"{{{ name }}}"のルールブロックを作成中',
  hasAlready: '"{{{ name }}}"のルールブロックを作成',
  readonly: false,
  isInstant: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.CreateRuleBlock,
    description:
      "システムプロンプトに注入するルールを作成します。既存のルールを変更するには、編集ツールを使用します。",
    parameters: {
      type: "object",
      required: ["name", "rule"],
      properties: {
        name: {
          type: "string",
          description: NAME_ARG_DESC,
        },
        rule: {
          type: "string",
          description: RULE_ARG_DESC,
        },
        description: {
          type: "string",
          description: DESC_ARG_DESC,
        },
        globs: {
          type: "string",
          description: GLOB_ARG_DESC,
        },
        regex: {
          type: "string",
          description: REGEX_ARG_DESC,
        },
        alwaysApply: {
          type: "boolean",
          description: ALWAYS_APPLY_DESC,
        },
      },
    },
  },
  defaultToolPolicy: "disabled",
  systemMessageDescription: {
    prefix: `ユーザーがあなたの出力に対してフィードバックやガイダンスを提供することがあります。これらの「ルール」を認識していなかった場合は、${BuiltInToolNames.CreateRuleBlock} ツールを使用して、将来のやり取りのためにルールを保存することを検討してください。
このツールは既存のルールを編集するために使用することはできませんが、".continue/rules" フォルダ内を検索し、編集ツールを使用してルールを管理できます。
ルールを作成するには、${BuiltInToolNames.CreateRuleBlock} ツール呼び出しと以下の引数を使用して応答してください:
- name: ${NAME_ARG_DESC}
- rule: ${RULE_ARG_DESC}
- description: ${DESC_ARG_DESC}
- globs: ${GLOB_ARG_DESC}
- alwaysApply: ${ALWAYS_APPLY_DESC}
例:`,
    exampleArgs: [
      ["name", "Use PropTypes"],
      [
        "rule",
        "Always use PropTypes when declaring React component properties",
      ],
      [
        "description",
        "Ensure that all prop types are explicitly declared for better type safety and code maintainability in React components.",
      ],
      ["globs", "**/*.js"],
      ["alwaysApply", "false"],
    ],
  },
  toolCallIcon: "PencilIcon",
};
