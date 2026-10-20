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
    prefix: `To view the user's currently open file, use the ${BuiltInToolNames.ReadCurrentlyOpenFile} tool.
If the user is asking about a file and you don't see any code, use this to check the current file`,
  },
  toolCallIcon: "DocumentTextIcon",
};
