import * as fs from "fs";
import * as path from "path";

import { t } from "../i18n.js";

import { formatToolArgument } from "./formatters.js";
import { Tool } from "./types.js";

// List files in a directory
export const listFilesTool: Tool = {
  name: "List",
  displayName: "List",
  description: "ディレクトリ内のファイルを一覧表示します",
  parameters: {
    type: "object",
    required: ["dirpath"],
    properties: {
      dirpath: {
        type: "string",
        description: "一覧表示するディレクトリへのパス",
      },
    },
  },
  readonly: true,
  isBuiltIn: true,
  preprocess: async (args) => {
    // Resolve relative paths
    const normalizedPath = path.normalize(args.dirpath);
    const dirPath = path.resolve(process.cwd(), normalizedPath);

    if (!fs.existsSync(dirPath)) {
      throw new Error(`ディレクトリが存在しません: ${dirPath}`);
    }

    if (!fs.statSync(dirPath).isDirectory()) {
      throw new Error(`エラー: パスはディレクトリではありません: ${dirPath}`);
    }

    return {
      args: {
        dirpath: dirPath,
      },
      preview: [
        {
          type: "text",
          content: dirPath
            ? `一覧表示予定: ${formatToolArgument(dirPath)}`
            : "現在のディレクトリのファイルを一覧表示する予定です",
        },
      ],
    };
  },
  run: async (args: { dirpath: string }): Promise<string> => {
    try {
      const files = fs.readdirSync(args.dirpath);
      const fileDetails = files.map((file) => {
        const fullPath = path.join(args.dirpath, file);
        const stats = fs.statSync(fullPath);
        const type = stats.isDirectory() ? "directory" : "file";
        const size = stats.isFile() ? `${stats.size} bytes` : "";
        return `${file} (${type}${size ? `, ${size}` : ""})`;
      });

      return `${args.dirpath} 内のファイル:\n${fileDetails.join("\n")}`;
    } catch (error) {
      throw new Error(
        `Error listing files: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  },
};
