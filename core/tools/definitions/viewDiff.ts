import { Tool } from "../..";

import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const viewDiffTool: Tool = {
  type: "function",
  displayTitle: "View Diff",
  wouldLikeTo: "git diffを取得します",
  isCurrently: "git diffを取得中",
  hasAlready: "git diffを取得",
  readonly: true,
  isInstant: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.ViewDiff,
    description: "作業中の変更の現在の差分を返します。",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  systemMessageDescription: {
    prefix: `現在のgit diffを表示するには、${BuiltInToolNames.ViewDiff} ツールを使用してください。これにより、前回のコミットと比較して作業ディレクトリで行われた変更が表示されます。`,
  },
  defaultToolPolicy: "allowedWithoutPermission",
  toolCallIcon: "CodeBracketIcon",
};
