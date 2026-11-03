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
    description: `単一のファイルに対して複数の編集を行います。${NO_PARALLEL_TOOL_CALLING_INSTRUCTION}`,
    parameters: {
      type: "object",
      required: ["filepath", "edits"],
      properties: {
        filepath: {
          type: "string",
          description:
            "編集するファイルのパス。ワークスペースのルートからの相対パス。",
        },
        edits: {
          type: "array",
          description: "ファイルに対して順次実行する編集操作の配列。成功率を上げるためには、編集操作を分割し、多くの配列で記述する必要があります。",
          items: {
            type: "object",
            required: ["old_string", "new_string"],
            properties: {
              old_string: {
                type: "string",
                description:
                  "置換するテキスト。成功率を上げるためには、可能な限り短くする必要があります。",
              },
              new_string: {
                type: "string",
                description:
                  "置換後のテキスト。",
              },
              replace_all: {
                type: "boolean",
                description:
                  "ファイル内のold_stringのすべての出現箇所を置換するかどうか(デフォルトはfalse)。",
              },
            },
          },
        },
      },
    },
  },
  systemMessageDescription: {
    prefix: `単一のファイルに対して複数の編集を行うには、filepath（ワークスペースのルートからの相対パス）とeditsの配列を使用して ${BuiltInToolNames.MultiEdit} ツールを使用してください。\n\n  例えば、次のように応答できます:`,
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
