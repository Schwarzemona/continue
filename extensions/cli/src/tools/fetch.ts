import type { ContextItem } from "core/index.js";
import { fetchUrlContentImpl } from "core/tools/implementations/fetchUrlContent.js";
import { ContinueError, ContinueErrorReason } from "core/util/errors.js";

import { t } from "../i18n.js";
import {
  parseEnvNumber,
  truncateOutputFromEnd,
} from "../util/truncateOutput.js";

import { Tool } from "./types.js";

// Output truncation defaults
const DEFAULT_FETCH_MAX_CHARS = 20000;

function getFetchMaxChars(): number {
  return parseEnvNumber(
    process.env.CONTINUE_CLI_FETCH_MAX_OUTPUT_LENGTH,
    DEFAULT_FETCH_MAX_CHARS,
  );
}

export const fetchTool: Tool = {
  name: "Fetch",
  displayName: "Fetch",
  description:
    "URLからコンテンツを取得し、Markdownに変換します。長いコンテンツは切り詰めて扱います",
  parameters: {
    type: "object",
    required: ["url"],
    properties: {
      url: {
        type: "string",
        description: "コンテンツを取得するURL",
      },
    },
  },
  readonly: true,
  isBuiltIn: true,
  preprocess: async (args) => {
    return {
      preview: [
        {
          type: "text",
          content: `取得予定: ${args.url}`,
        },
      ],
      args,
    };
  },
  run: async (args: { url: string }): Promise<string> => {
    const { url } = args;

    try {
      // Suppress console errors from JSDOM CSS parsing
      const originalConsoleError = console.error;
      console.error = () => {};

      // Use the core fetchUrlContent implementation
      const contextItems = await fetchUrlContentImpl({ url }, { fetch });

      // Restore console.error
      console.error = originalConsoleError;

      if (contextItems.length === 0) {
        throw new ContinueError(
          ContinueErrorReason.Unspecified,
          `${url} からコンテンツを取得できませんでした`,
        );
      }

      // Format the results for CLI display
      const combinedContent = contextItems
        .filter((item: ContextItem) => item.name !== "Truncation warning")
        .map((item: ContextItem) => item.content)
        .join("\n\n");

      // Apply CLI-level truncation
      const maxChars = getFetchMaxChars();
      const { output: truncatedOutput } = truncateOutputFromEnd(
        combinedContent,
        maxChars,
        "取得したコンテンツ",
      );

      return truncatedOutput;
    } catch (error) {
      if (error instanceof ContinueError) {
        throw error;
      }
      throw new Error(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
};
