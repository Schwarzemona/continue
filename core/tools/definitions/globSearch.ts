import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const globSearchTool: Tool = {
  type: "function",
  displayTitle: "Glob File Search",
  wouldLikeTo: '"{{{ pattern }}}"のファイル名を検索します',
  isCurrently: '"{{{ pattern }}}"のファイル名を検索中',
  hasAlready: '"{{{ pattern }}}"のファイル名を検索',
  readonly: true,
  isInstant: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.FileGlobSearch,
    description:
      "Globパターンを使用してプロジェクト内のファイル名を再帰的に検索した結果を返します。出力が切り詰められることがあるため、対象を絞ったパターンを使用します。",
    parameters: {
      type: "object",
      required: ["pattern"],
      properties: {
        pattern: {
          type: "string",
          description: "Globパターンでファイルパスを照合します。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `To return a list of files based on a glob search pattern, use the ${BuiltInToolNames.FileGlobSearch} tool`,
    exampleArgs: [["pattern", "*.py"]],
  },
  toolCallIcon: "MagnifyingGlassIcon",
};
