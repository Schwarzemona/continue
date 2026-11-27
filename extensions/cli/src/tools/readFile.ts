import * as fs from "fs";

import { throwIfFileIsSecurityConcern } from "core/indexing/ignore.js";
import { ContinueError, ContinueErrorReason } from "core/util/errors.js";

import { t } from "../i18n.js";
import { parseEnvNumber } from "../util/truncateOutput.js";

import { formatToolArgument } from "./formatters.js";
import { Tool, ToolRunContext } from "./types.js";

// Output truncation defaults
const DEFAULT_READ_FILE_MAX_CHARS = 100000; // ~25k tokens
const DEFAULT_READ_FILE_MAX_LINES = 5000;

function getReadFileMaxChars(): number {
  return parseEnvNumber(
    process.env.CONTINUE_CLI_READ_FILE_MAX_OUTPUT_CHARS,
    DEFAULT_READ_FILE_MAX_CHARS,
  );
}

function getReadFileMaxLines(): number {
  return parseEnvNumber(
    process.env.CONTINUE_CLI_READ_FILE_MAX_OUTPUT_LINES,
    DEFAULT_READ_FILE_MAX_LINES,
  );
}

// Track files that have been read in the current session
export const readFilesSet = new Set<string>();
export function markFileAsRead(filePath: string) {
  readFilesSet.add(filePath);
}

export const readFileTool: Tool = {
  name: "Read",
  displayName: "Read",
  description: "指定したパスのファイル内容を読み取ります",
  parameters: {
    type: "object",
    required: ["filepath"],
    properties: {
      filepath: {
        type: "string",
        description: "読み取るファイルへのパス",
      },
    },
  },
  readonly: true,
  isBuiltIn: true,
  preprocess: async (args) => {
    let { filepath } = args;
    if (filepath.startsWith("./")) {
      filepath = filepath.slice(2);
    }
    throwIfFileIsSecurityConcern(filepath);
    return {
      args,
      preview: [
        {
          type: "text",
          content: t(
            `Will read ${formatToolArgument(filepath)}`,
            `${formatToolArgument(filepath)} を読み込みます`,
          ),
        },
      ],
    };
  },
  run: async (
    args: { filepath: string },
    context?: ToolRunContext,
  ): Promise<string> => {
    try {
      let { filepath } = args;
      if (filepath.startsWith("./")) {
        filepath = filepath.slice(2);
      }

      if (!fs.existsSync(filepath)) {
        throw new ContinueError(
          ContinueErrorReason.Unspecified,
          t(
            `File does not exist: ${filepath}`,
            `ファイルが存在しません: ${filepath}`,
          ),
        );
      }
      const realPath = fs.realpathSync(filepath);
      const content = fs.readFileSync(realPath, "utf-8");

      // Divide limits by parallel tool call count to avoid context overflow
      const parallelCount = context?.parallelToolCallCount ?? 1;
      const baseMaxLines = getReadFileMaxLines();
      const baseMaxChars = getReadFileMaxChars();
      const maxLines = Math.floor(baseMaxLines / parallelCount);
      const maxChars = Math.floor(baseMaxChars / parallelCount);
      const lineCount = content.split("\n").length;
      const charCount = content.length;

      if (charCount > maxChars || lineCount > maxLines) {
        const chars = charCount.toLocaleString();
        const lines = lineCount.toLocaleString();
        const maxCharsLabel = maxChars.toLocaleString();
        const maxLinesLabel = maxLines.toLocaleString();

        // Include note about single-tool limit when parallel calls reduce the limit
        const parallelNote =
          parallelCount > 1
            ? t(
                ` (Note: limit reduced due to ${parallelCount} parallel tool calls. Single-tool limit: ${baseMaxChars.toLocaleString()} characters or ${baseMaxLines.toLocaleString()} lines.)`,
                ` (注意: ${parallelCount} 件の並列ツール呼び出しのため上限が低下しています。単独呼び出し時の上限: ${baseMaxChars.toLocaleString()} 文字または ${baseMaxLines.toLocaleString()} 行。)`,
              )
            : "";

        throw new ContinueError(
          ContinueErrorReason.FileTooLarge,
          t(
            `File is too large to read: ${filepath} (${chars} characters, ${lines} lines). Maximum allowed: ${maxCharsLabel} characters or ${maxLinesLabel} lines.${parallelNote} Consider using terminal commands like 'head', 'tail', 'sed', or 'grep' to read targeted parts of the file.`,
            `ファイルを読み取るにはサイズが大きすぎます: ${filepath} (${chars} 文字、${lines} 行)。許可される上限: ${maxCharsLabel} 文字または ${maxLinesLabel} 行。${parallelNote} terminal コマンド（'head'、'tail'、'sed'、'grep' など）を使い、ファイルの必要な部分だけを読む方法も検討してください。`,
          ),
        );
      }

      // Mark this file as read for the edit tool
      markFileAsRead(realPath);

      return t(
        `Content of ${filepath}:\n${content}`,
        `${filepath} の内容:\n${content}`,
      );
    } catch (error) {
      if (error instanceof ContinueError) {
        throw error;
      }
      throw new Error(
        `Error reading file: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  },
};
