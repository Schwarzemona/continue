import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export interface EditToolArgs {
  filepath: string;
  changes: string;
}

export const NO_PARALLEL_TOOL_CALLING_INSTRUCTION =
  "このツールは他のどのツールとも並行して呼び出すことはできません。";

const CHANGES_DESCRIPTION =
  "ファイルへの変更内容。必要な変更のみを示します。これをコードブロックで囲んだり、コードの変更以外の内容を書いたりしません。大きなファイルの場合は、変更のない大きなセクションに対して、言語に適した簡潔なプレースホルダーを使用します（例: 「// ... existing code ...」。";

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
    prefix: `To edit an EXISTING file, use the ${BuiltInToolNames.EditExistingFile} tool with
- filepath: the relative filepath to the file.
- changes: ${CHANGES_DESCRIPTION}
Only use this tool if you already know the contents of the file. Otherwise, use the ${BuiltInToolNames.ReadFile} or ${BuiltInToolNames.ReadCurrentlyOpenFile} tool to read it first.
For example:`,
    exampleArgs: [
      ["filepath", "path/to/the_file.ts"],
      [
        "changes",
        "// ... existing code ...\nfunction subtract(a: number, b: number): number {\n  return a - b;\n}\n// ... rest of code ...",
      ],
    ],
  },
};
