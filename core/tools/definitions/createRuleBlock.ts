import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

const NAME_ARG_DESC =
  "番号(00-) + 名前。小文字、数字、ハイフンのみ使用します。";
const RULE_ARG_DESC =
  "将来のコード生成のための、明確で命令的な指示を記述します。";
const DESC_ARG_DESC =
  "具体的に記述し、重要な用語を含めます。ルールが何を行うのかと、使用すべき特定のトリガー/コンテキストの両方を含めます。";
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
    prefix: `Sometimes the user will provide feedback or guidance on your output. If you were not aware of these "rules", consider using the ${BuiltInToolNames.CreateRuleBlock} tool to persist the rule for future interactions.
This tool cannot be used to edit existing rules, but you can search in the ".continue/rules" folder and use the edit tool to manage rules.
To create a rule, respond with a ${BuiltInToolNames.CreateRuleBlock} tool call and the following arguments:
- name: ${NAME_ARG_DESC}
- rule: ${RULE_ARG_DESC}
- description: ${DESC_ARG_DESC}
- globs: ${GLOB_ARG_DESC}
- alwaysApply: ${ALWAYS_APPLY_DESC}
For example:`,
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
