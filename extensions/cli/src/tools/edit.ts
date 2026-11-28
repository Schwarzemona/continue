import * as fs from "fs";
import path from "path";

import { validateSingleEdit } from "core/edit/searchAndReplace/findAndReplaceUtils.js";
import { executeFindAndReplace } from "core/edit/searchAndReplace/performReplace.js";
import { throwIfFileIsSecurityConcern } from "core/indexing/ignore.js";
import { ContinueError, ContinueErrorReason } from "core/util/errors.js";

import { t } from "../i18n.js";

import { EditOperation } from "./multiEdit.js";
import { readFilesSet, readFileTool } from "./readFile.js";
import { Tool } from "./types.js";
import { generateDiff } from "./writeFile.js";

export function validateAndResolveFilePath(args: any): {
  originalPath: string;
  resolvedPath: string;
} {
  const { file_path } = args;

  if (!file_path) {
    throw new ContinueError(
      ContinueErrorReason.FindAndReplaceMissingFilepath,
      t("file_path is required", "file_path が必須です"),
    );
  }

  const absolutePath = path.isAbsolute(file_path)
    ? file_path
    : path.resolve(process.cwd(), file_path);

  const resolvedPath = fs.realpathSync(absolutePath);

  throwIfFileIsSecurityConcern(resolvedPath);

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    throw new ContinueError(
      ContinueErrorReason.FileNotFound,
      t(
        `File ${file_path} does not exist`,
        `ファイル ${file_path} は存在しません`,
      ),
    );
  }

  // Check if file has been read
  if (!readFilesSet.has(resolvedPath)) {
    throw new ContinueError(
      ContinueErrorReason.EditToolFileNotRead,
      t(
        `You must use the ${readFileTool.name} tool to read ${file_path} before editing it.`,
        `編集する前に ${readFileTool.name} ツールで ${file_path} を読み取る必要があります。`,
      ),
    );
  }

  return { originalPath: file_path, resolvedPath: resolvedPath };
}

export interface EditArgs extends EditOperation {
  file_path: string;
}

export const editTool: Tool = {
  name: "Edit",
  displayName: "Edit",
  readonly: false,
  isBuiltIn: true,
  description: `ファイル内の文字列を正確に置換します。

使用方法: 
- 編集を行う直前には、必ず \`${readFileTool.name}\` ツールを使用して、ファイルの最新の内容と文脈を把握してください。
- \`${readFileTool.name}\` ツールの出力からテキストを編集する場合、空白やインデントを正確に保持するようにしてください。
- コードベース内の既存のファイルを編集することを優先してください。明示的に要求されない限り、新しいファイルは作成しないでください。
- ユーザーから明示的に要求されない限り、絵文字を使用しないでください。ファイルへの絵文字の追加は避けてください。
- ファイル全体で文字列の置換や名前変更を行う場合は、\`replace_all\` を使用してください。これは、例えば変数の名前を変更したい場合に便利です。

警告:
- \`replace_all\` を使用しない場合、\`old_string\` がファイル内で一意でないと、編集は失敗します。より多くの文脈を含む大きな文字列を指定するか、\`replace_all\` を使用して \`old_string\` のすべての出現箇所を変更してください。
- 最新のファイル内容を確認するために、直近で \`${readFileTool.name}\` ツールを使用していない場合、編集は失敗します。`,
  parameters: {
    type: "object",
    required: ["file_path", "old_string", "new_string"],
    properties: {
      file_path: {
        type: "string",
        description:
          "変更するファイルへの絶対または相対パス。絶対パスを優先してください",
      },
      old_string: {
        type: "string",
        description:
          "置き換え対象のテキスト。空白やインデントも含めて完全一致する必要があります",
      },
      new_string: {
        type: "string",
        description:
          "置き換え後のテキスト（old_string と異なるものである必要があります）",
      },
      replace_all: {
        type: "boolean",
        description:
          "old_string のすべての出現箇所を置き換えます（既定は false）",
      },
    },
  },
  preprocess: async (args) => {
    const { old_string, new_string, replace_all } = args as EditArgs;

    const { resolvedPath } = validateAndResolveFilePath(args);

    const { oldString, newString, replaceAll } = validateSingleEdit(
      old_string,
      new_string,
      replace_all,
    );

    const oldContent = fs.readFileSync(resolvedPath, "utf-8");
    const newContent = executeFindAndReplace(
      oldContent,
      oldString,
      newString,
      replaceAll ?? false,
      0,
    );

    // Generate diff for preview
    const diff = generateDiff(oldContent, newContent, resolvedPath);

    return {
      args: {
        resolvedPath,
        newContent,
        oldContent,
      },
      preview: [
        {
          type: "text",
          content: "以下の変更を行う予定です:",
        },
        {
          type: "diff",
          content: diff,
        },
      ],
    };
  },
  run: async (args: {
    resolvedPath: string;
    newContent: string;
    oldContent: string;
  }) => {
    try {
      fs.writeFileSync(args.resolvedPath, args.newContent, "utf-8");

      // Generate diff for result display
      const diff = generateDiff(
        args.oldContent,
        args.newContent,
        args.resolvedPath,
      );

      return `${args.resolvedPath} を正常に編集しました\nDiff:\n${diff}`;
    } catch (error) {
      if (error instanceof ContinueError) {
        throw error;
      }
      throw new ContinueError(
        ContinueErrorReason.FileWriteError,
        `Error: failed to edit ${args.resolvedPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  },
};
