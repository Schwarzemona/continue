import { Tool } from "../..";

import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const viewRepoMapTool: Tool = {
  type: "function",
  displayTitle: "View Repo Map",
  wouldLikeTo: "リポジトリマップを取得します",
  isCurrently: "リポジトリマップを取得中",
  hasAlready: "リポジトリマップを取得",
  readonly: true,
  isInstant: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.ViewRepoMap,
    description: "リポジトリマップを返します。",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  systemMessageDescription: {
    prefix: `リポジトリマップを表示するには、${BuiltInToolNames.ViewRepoMap} ツールを使用してください。これにより、プロジェクトの構造と構成の視覚的な表現が提供されます。`,
  },
  defaultToolPolicy: "allowedWithPermission",
  toolCallIcon: "MapIcon",
};
