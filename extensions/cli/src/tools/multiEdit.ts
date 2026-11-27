import * as fs from "fs";

import { validateMultiEdit } from "core/edit/searchAndReplace/multiEditValidation.js";
import { executeMultiFindAndReplace } from "core/edit/searchAndReplace/performReplace.js";
import { ContinueError, ContinueErrorReason } from "core/util/errors.js";

import { t } from "../i18n.js";
import { telemetryService } from "../telemetry/telemetryService.js";
import {
  calculateLinesOfCodeDiff,
  getLanguageFromFilePath,
} from "../telemetry/utils.js";

import { editTool, validateAndResolveFilePath } from "./edit.js";
import { readFileTool } from "./readFile.js";
import { Tool } from "./types.js";
import { generateDiff } from "./writeFile.js";

export interface EditOperation {
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

export interface MultiEditArgs {
  file_path: string;
  edits: EditOperation[];
}

export const multiEditTool: Tool = {
  name: "MultiEdit",
  displayName: "MultiEdit",
  readonly: false,
  isBuiltIn: true,
  description: `1回の操作で単一ファイルに対して複数の編集を行います。効率的に複数の検索・置換操作を実行できます。
同じファイルに対して複数の編集が必要な場合は、${editTool.name} ツールよりもこのツールを使用してください。

ファイルに対して複数の編集を行うには、以下を指定します：
1. file_path: 変更するファイルの絶対パス。相対パスも使用可能（cwdを基準に解決されます）ですが、絶対パスが推奨されます。
2. edits: 実行する編集操作の配列。各編集には以下が含まれます：
   - old_string: 置換対象のテキスト（空白やインデントを含め、ファイルの内容と完全に一致する必要があります）
   - new_string: old_string を置き換える編集後のテキスト
   - replace_all: old_string のすべての出現箇所を置換するかどうか。このパラメータは任意で、既定は false です。

重要：
- ユーザーやリンターなどによって、ツール呼び出しの間にファイルが変更される可能性があるため、可能な限りすべての編集を1回のツール呼び出しで行ってください。例えば、ファイル内に他の変更がある場合、インポートのみを編集しないでください。ツール呼び出しの間に未使用のインポートがリンターによって削除される可能性があります。
- すべての編集は、提供された順序に従って逐次適用されます。
- 各編集は前の編集の結果に対して動作するため、逐次操作間の競合を避けるために編集計画を慎重に立ててください。
- 編集はアトミックです。操作を成功させるにはすべての編集が有効である必要があります。いずれかの編集が失敗した場合、どの編集も適用されません。
- このツールは、同じファイルの異なる部分に複数の変更を加える必要がある場合に最適です。

必須要件：
1. 編集を行う直前には、必ず ${readFileTool.name} ツールを使用して、ファイルの最新の内容と文脈を把握してください。
2. 編集を行う際：
- すべての編集が、慣用的で正しいコードになるようにしてください。
- コードが壊れた状態にならないようにしてください。
- 常に絶対ファイルパス（/ で始まる）を使用してください。
- ユーザーから明示的に要求されない限り、絵文字を使用しないでください。ファイルへの絵文字の追加は避けてください。
- ファイル全体で文字列の置換や名前変更を行う場合は、\`replace_all\` を使用してください。これは、例えば変数の名前を変更したい場合に便利です。
- 空の old_string を使用して、ファイルの先頭にコンテンツを挿入することもできます。

警告：
- 以前の編集が、後続の編集が探そうとしているテキストに影響を与える場合、ファイルが混乱する可能性があります。
- edits.old_string がファイルの内容と完全一致しない場合（空白を含む）、ツールは失敗します。
- edits.old_string と edits.new_string が同じ場合、ツールは失敗します。これらは必ず異なっている必要があります。
- このセッションで ${readFileTool.name} ツールを使用してファイルを読み込んでいない場合、ツールは失敗します。
- ファイルが存在しない場合、ツールは失敗します。新しいファイルを作成することはできません。
- このツールは新しいファイルを作成することはできません。ファイルは既に存在している必要があります。`,
  parameters: {
    type: "object",
    required: ["file_path", "edits"],
    properties: {
      file_path: {
        type: "string",
        description:
          "変更するファイルへの絶対または相対パス。絶対パスを優先してください",
      },
      edits: {
        type: "array",
        description: "ファイルに対して順次実行する編集操作の配列",
        items: {
          type: "object",
          required: ["old_string", "new_string"],
          properties: {
            old_string: {
              type: "string",
              description:
                "置換対象のテキスト（空白やインデントを含む完全一致）",
            },
            new_string: {
              type: "string",
              description:
                "置き換え後のテキスト。old_string と異なるものである必要があります。",
            },
            replace_all: {
              type: "boolean",
              description:
                "ファイル内の old_string のすべての出現箇所を置き換えます（既定は false）",
            },
          },
        },
      },
    },
  },
  preprocess: async (args) => {
    const { resolvedPath } = validateAndResolveFilePath(args);

    const { edits } = validateMultiEdit(args);

    const currentContent = fs.readFileSync(resolvedPath, "utf-8");
    const newContent = executeMultiFindAndReplace(currentContent, edits);

    // Generate diff for preview
    const diff = generateDiff(currentContent, newContent, resolvedPath);

    return {
      args: {
        file_path: resolvedPath,
        newContent,
        originalContent: currentContent,
        editCount: edits.length,
      },
      preview: [
        {
          type: "text",
          content: `${resolvedPath} に対して ${edits.length} 件の編集を行う予定です:`,
        },
        {
          type: "diff",
          content: diff,
        },
      ],
    };
  },
  run: async (args: {
    file_path: string;
    newContent: string;
    originalContent: string;
    editCount: number;
  }) => {
    try {
      fs.writeFileSync(args.file_path, args.newContent, "utf-8");

      // Get lines for telemetry
      const { added, removed } = calculateLinesOfCodeDiff(
        args.originalContent,
        args.newContent,
      );
      const language = getLanguageFromFilePath(args.file_path);

      if (added > 0) {
        telemetryService.recordLinesOfCodeModified("added", added, language);
      }
      if (removed > 0) {
        telemetryService.recordLinesOfCodeModified(
          "removed",
          removed,
          language,
        );
      }

      // Generate diff for result display
      const diff = generateDiff(
        args.originalContent,
        args.newContent,
        args.file_path,
      );

      return `${args.file_path} を ${args.editCount} 件の編集で正常に編集しました\nDiff:\n${diff}`;
    } catch (error) {
      if (error instanceof ContinueError) {
        throw error;
      }
      throw new ContinueError(
        ContinueErrorReason.FileWriteError,
        `Error: failed to edit ${args.file_path}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  },
};
