import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export interface EditToolArgs {
  filepath: string;
  changes: string;
}

export const NO_PARALLEL_TOOL_CALLING_INSTRUCTION =
  "このツールは他のどのツールとも並行して呼び出すことはできません。";

const CHANGES_DESCRIPTION =
  "ファイルへの変更内容。";

export const editFileTool: Tool = {
  type: "function",
  displayTitle: "Edit File",
  wouldLikeTo: "{{{ filepath }}}を編集します",
  isCurrently: "{{{ filepath }}}を編集中",
  hasAlready: "{{{ filepath }}}を編集",
  group: BUILT_IN_GROUP_NAME,
  readonly: false,
  isInstant: false,
  function: {
    name: BuiltInToolNames.EditExistingFile,
    description: `既存のファイルを編集します。${NO_PARALLEL_TOOL_CALLING_INSTRUCTION}`,
    parameters: {
      type: "object",
      required: ["filepath", "changes"],
      properties: {
        filepath: {
          type: "string",
          description:
            "編集するファイルのパス。ワークスペースのルートからの相対パス。",
        },
        changes: {
          type: "string",
          description: CHANGES_DESCRIPTION,
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithPermission",
  systemMessageDescription: {
    prefix: `既存のファイルを編集するには、以下の引数を使用して ${BuiltInToolNames.EditExistingFile} ツールを使用してください:
- filepath: ファイルへの相対パス。
- changes: ${CHANGES_DESCRIPTION}
このツールは、すでにファイルの内容を知っている場合にのみ使用してください。そうでない場合は、まず ${BuiltInToolNames.ReadFile} または ${BuiltInToolNames.ReadCurrentlyOpenFile} ツールを使用してファイルを読み取ってください。
例:`,
    exampleArgs: [
      ["filepath", "path/to/the_file.ts"],
      [
        "changes",
        "// ... existing code ...\nfunction subtract(a: number, b: number): number {\n  return a - b;\n}\n// ... rest of code ...",
      ],
    ],
  },
};
