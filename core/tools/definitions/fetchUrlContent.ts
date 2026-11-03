import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const fetchUrlContentTool: Tool = {
  type: "function",
  displayTitle: "Read URL",
  wouldLikeTo: "{{{ url }}}を取得します",
  isCurrently: "{{{ url }}}を取得中",
  hasAlready: "{{{ url }}}を取得",
  readonly: true,
  isInstant: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.FetchUrlContent,
    description: "URLを使用してウェブサイトの内容を返します。",
    parameters: {
      type: "object",
      required: ["url"],
      properties: {
        url: {
          type: "string",
          description: "読み込むURL。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithPermission",
  systemMessageDescription: {
    prefix: `URLの内容を取得するには、${BuiltInToolNames.FetchUrlContent} ツールを使用してください。例えば、ウェブページの内容を読み取るには、次のように応答するかもしれません:`,
    exampleArgs: [["url", "https://example.com"]],
  },
  toolCallIcon: "GlobeAltIcon",
};
