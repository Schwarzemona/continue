import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const globSearchTool: Tool = {
  type: "function",
  displayTitle: "Glob File Search",
  wouldLikeTo: '"{{{ pattern }}}"のファイル名を検索します',
  isCurrently: '"{{{ pattern }}}"のファイル名を検索中',
  hasAlready: '"{{{ pattern }}}"のファイル名を検索しました',
  readonly: true,
  isInstant: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.FileGlobSearch,
    description:
      "プロジェクト内のファイル名をGlobで検索し、ファイル名を返します。出力が切り詰められることがあるため、対象を絞ったパターンを使用します。",
    parameters: {
      type: "object",
      required: ["pattern"],
      properties: {
        pattern: {
          type: "string",
          description: "検索するGlobパターン。",
        },
        dirPath: {
          type: "string",
          description:
            "検索対象を絞るディレクトリのパス。プロジェクトルートからの相対パス、絶対パス、チルダパス(~/...)、またはfile://URIが指定できます。省略した場合はワークスペース全体が対象です。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `Glob検索パターンに基づいてファイルの一覧を返すには、${BuiltInToolNames.FileGlobSearch} ツールを使用してください`,
    exampleArgs: [["pattern", "*.py"]],
  },
  toolCallIcon: "MagnifyingGlassIcon",
};
