import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const readCurrentlyOpenFileTool: Tool = {
  type: "function",
  displayTitle: "Read Currently Open File",
  wouldLikeTo: "現在開いているファイルを確認します",
  isCurrently: "現在開いているファイルを確認中",
  hasAlready: "現在開いているファイルを確認",
  readonly: true,
  isInstant: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.ReadCurrentlyOpenFile,
    description:
      "IDEで現在開かれているファイルを読み取ります。ユーザーが、見えないファイルについて言及している場合、このツールを試します。",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  defaultToolPolicy: "allowedWithPermission",
  systemMessageDescription: {
    prefix: `ユーザーが現在開いているファイルを確認するには、${BuiltInToolNames.ReadCurrentlyOpenFile} ツールを使用してください。\nユーザーがファイルについて尋ねているのにコードが見当たらない場合は、これを使用して現在のファイルを確認してください。`,
  },
  toolCallIcon: "DocumentTextIcon",
};
