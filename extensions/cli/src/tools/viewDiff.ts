import * as child_process from "child_process";
import * as fs from "fs";
import * as util from "util";

import { t } from "../i18n.js";
import {
  parseEnvNumber,
  truncateOutputFromEnd,
} from "../util/truncateOutput.js";

import { Tool } from "./types.js";

// Output truncation defaults
const DEFAULT_DIFF_MAX_CHARS = 50000;

function getDiffMaxChars(): number {
  return parseEnvNumber(
    process.env.CONTINUE_CLI_DIFF_MAX_OUTPUT_LENGTH,
    DEFAULT_DIFF_MAX_CHARS,
  );
}

const execPromise = util.promisify(child_process.exec);

export const viewDiffTool: Tool = {
  name: "Diff",
  displayName: "Diff",
  description: "gitリポジトリ内の未コミット変更をすべて表示します",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "gitリポジトリへのパス（既定は現在のディレクトリ）",
      },
    },
  },
  readonly: true,
  isBuiltIn: true,
  preprocess: async (args) => {
    return {
      args,
      preview: [
        {
          type: "text",
          content: t("Will show git diff", "git diff を表示する予定です"),
        },
      ],
    };
  },
  run: async (args: { path?: string }): Promise<string> => {
    try {
      const repoPath = args.path || process.cwd();
      if (!fs.existsSync(repoPath)) {
        return t(
          `Error: Path does not exist: ${repoPath}`,
          `エラー: パスが存在しません: ${repoPath}`,
        );
      }

      try {
        await execPromise("git rev-parse --is-inside-work-tree", {
          cwd: repoPath,
        });
      } catch {
        return t(
          `Error: The specified path is not a git repository: ${repoPath}`,
          `エラー: 指定されたパスは git リポジトリではありません: ${repoPath}`,
        );
      }

      const { stdout, stderr } = await execPromise("git diff", {
        cwd: repoPath,
      });

      if (stderr) {
        return t(
          `Error executing git diff: ${stderr}`,
          `git diff の実行に失敗しました: ${stderr}`,
        );
      }

      if (!stdout.trim()) {
        return t(
          "No changes detected in the git repository.",
          "git リポジトリに変更は見つかりませんでした。",
        );
      }

      const maxChars = getDiffMaxChars();
      const { output: truncatedOutput } = truncateOutputFromEnd(
        stdout,
        maxChars,
        t("diff output", "diff 出力"),
      );

      return t(
        `Git diff for repository at ${repoPath}:\n\n${truncatedOutput}`,
        `${repoPath} の git diff:\n\n${truncatedOutput}`,
      );
    } catch (error) {
      return `Error running git diff: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  },
};
