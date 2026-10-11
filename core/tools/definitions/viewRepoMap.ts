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
    description: "リポジトリマップを表示します。",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  systemMessageDescription: {
    prefix: `To view the repository map, use the ${BuiltInToolNames.ViewRepoMap} tool. This will provide a visual representation of the project's structure and organization.`,
  },
  defaultToolPolicy: "allowedWithPermission",
  toolCallIcon: "MapIcon",
};
