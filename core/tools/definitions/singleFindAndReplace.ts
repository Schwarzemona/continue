import { Tool } from "../..";
import { validateSingleEdit } from "../../edit/searchAndReplace/findAndReplaceUtils";
import { executeFindAndReplace } from "../../edit/searchAndReplace/performReplace";
import { validateSearchAndReplaceFilepath } from "../../edit/searchAndReplace/validateArgs";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";
import { NO_PARALLEL_TOOL_CALLING_INSTRUCTION } from "./editFile";

export interface SingleFindAndReplaceArgs {
  filepath: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

export const singleFindAndReplaceTool: Tool = {
  type: "function",
  displayTitle: "Find and Replace",
  wouldLikeTo: "{{{ filepath }}}を編集します",
  isCurrently: "{{{ filepath }}}を編集中",
  hasAlready: "{{{ filepath }}}を編集",
  group: BUILT_IN_GROUP_NAME,
  readonly: false,
  isInstant: false,
  function: {
    name: BuiltInToolNames.SingleFindAndReplace,
    description: `ファイル内で正確な文字列置換します。\`replace_all\`を使用しない場合、\`old_string\`がファイル内で一意でないと編集は失敗します。一意にするために周囲のコンテキストを含めたより長い文字列を指定するか、\`replace_all\`を使用して\`old_string\`のすべてのインスタンスを変更します。ユーザーが作業中にファイルを編集することもあります。編集を行う直前に、常に\`${BuiltInToolNames.ReadFile}\`ツールを使用して、ファイルの最新のコンテンツとコンテキストを理解します。${NO_PARALLEL_TOOL_CALLING_INSTRUCTION}`,
    parameters: {
      type: "object",
      required: ["filepath", "old_string", "new_string"],
      properties: {
        filepath: {
          type: "string",
          description:
            "修正するファイルのパス。ワークスペースのルートからの相対パス。",
        },
        old_string: {
          type: "string",
          description:
            "置換するテキスト。空白やインデントを含め、正確に一致する必要があります",
        },
        new_string: {
          type: "string",
          description:
            "置換後のテキスト。old_string とは異なる必要があります。",
        },
        replace_all: {
          type: "boolean",
          description:
            "ファイル内のold_stringのすべての出現箇所を置換します(デフォルトはfalse)。",
        },
      },
    },
  },
  systemMessageDescription: {
    prefix: `To perform exact string replacements in files, use the ${BuiltInToolNames.SingleFindAndReplace} tool with a filepath (relative to the root of the workspace) and the strings to find and replace.

  For example, you could respond with:`,
    exampleArgs: [
      ["filepath", "path/to/file.ts"],
      ["old_string", "const oldVariable = 'value'"],
      ["new_string", "const newVariable = 'updated'"],
      ["replace_all", "false"],
    ],
  },
  defaultToolPolicy: "allowedWithPermission",
  preprocessArgs: async (args, extras) => {
    const { oldString, newString, replaceAll } = validateSingleEdit(
      args.old_string,
      args.new_string,
      args.replace_all,
    );
    const fileUri = await validateSearchAndReplaceFilepath(
      args.filepath,
      extras.ide,
    );

    const editingFileContents = await extras.ide.readFile(fileUri);
    const newFileContents = executeFindAndReplace(
      editingFileContents,
      oldString,
      newString,
      replaceAll ?? false,
      0,
    );

    return {
      ...args,
      fileUri,
      editingFileContents,
      newFileContents,
    };
  },
};
