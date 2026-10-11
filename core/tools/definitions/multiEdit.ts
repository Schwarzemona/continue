import { Tool } from "../..";
import { validateMultiEdit } from "../../edit/searchAndReplace/multiEditValidation";
import { executeMultiFindAndReplace } from "../../edit/searchAndReplace/performReplace";
import { validateSearchAndReplaceFilepath } from "../../edit/searchAndReplace/validateArgs";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";
import { NO_PARALLEL_TOOL_CALLING_INSTRUCTION } from "./editFile";

export interface EditOperation {
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

export interface MultiEditArgs {
  filepath: string;
  edits: EditOperation[];
}

export const multiEditTool: Tool = {
  type: "function",
  displayTitle: "Multi Edit",
  wouldLikeTo: "{{{ filepath }}}を編集します",
  isCurrently: "{{{ filepath }}}を編集中",
  hasAlready: "{{{ filepath }}}を編集",
  group: BUILT_IN_GROUP_NAME,
  readonly: false,
  isInstant: false,
  function: {
    name: BuiltInToolNames.MultiEdit,
    description: `単一のファイルに対して複数の編集を行います。複数の編集を行うには、filepathとeditsの配列が必要です。ツール呼び出しの間に、ユーザーやリンターなどによってファイルが変更される可能性があるため、可能な限りすべての編集を1回のツール呼び出しで行います。編集成功率を上げるために、editsを細かく分割します。ユーザーが作業中にファイルを編集することもあります。編集を行う直前に、常に${BuiltInToolNames.ReadFile}ツールを使用して、ファイルの最新のコンテンツとコンテキストを理解します。${NO_PARALLEL_TOOL_CALLING_INSTRUCTION}`,
    parameters: {
      type: "object",
      required: ["filepath", "edits"],
      properties: {
        filepath: {
          type: "string",
          description:
            "修正するファイルのパス。ワークスペースのルートからの相対パス。",
        },
        edits: {
          type: "array",
          description: "ファイルに対して順次実行する編集操作の配列。",
          items: {
            type: "object",
            required: ["old_string", "new_string"],
            properties: {
              old_string: {
                type: "string",
                description:
                  "置換するテキスト(すべての空白/インデントを含め、元のファイルの内容と正確に一致させる)。",
              },
              new_string: {
                type: "string",
                description:
                  "置換後のテキスト。old_stringとは異なる必要があります。",
              },
              replace_all: {
                type: "boolean",
                description:
                  "ファイル内のold_stringのすべての出現箇所を置換します(デフォルトはfalse)。",
              },
            },
          },
        },
      },
    },
  },
  systemMessageDescription: {
    prefix: `To make multiple edits to a single file, use the ${BuiltInToolNames.MultiEdit} tool with a filepath (relative to the root of the workspace) and an array of edit operations.

  For example, you could respond with:`,
    exampleArgs: [
      ["filepath", "path/to/file.ts"],
      [
        "edits",
        `[
  { "old_string": "const oldVar = 'value'", "new_string": "const newVar = 'updated'" },
  { "old_string": "oldFunction()", "new_string": "newFunction()", "replace_all": true }
]`,
      ],
    ],
  },
  defaultToolPolicy: "allowedWithPermission",
  preprocessArgs: async (args, extras) => {
    const { edits } = validateMultiEdit(args);
    const fileUri = await validateSearchAndReplaceFilepath(
      args.filepath,
      extras.ide,
    );

    const editingFileContents = await extras.ide.readFile(fileUri);
    const newFileContents = executeMultiFindAndReplace(
      editingFileContents,
      edits,
    );

    return {
      ...args,
      fileUri,
      editingFileContents,
      newFileContents,
    };
  },
};
