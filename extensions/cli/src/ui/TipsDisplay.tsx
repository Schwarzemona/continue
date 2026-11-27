import { Box, Text } from "ink";
import React, { useMemo } from "react";

import { t } from "../i18n.js";

// Array of helpful tips for Continue CLI users
const CONTINUE_CLI_TIPS = [
  t(
    "Use `/help` to learn keyboard shortcuts",
    "`/help` を使ってキーボードショートカットを確認できます",
  ),
  t(
    "Press escape to pause cn, and press enter to continue",
    "Esc で cn を一時停止し、Enter で再開できます",
  ),
  t(
    "Use arrow keys (↑/↓) to navigate through your input history",
    "矢印キー(↑/↓)で入力履歴をたどれます",
  ),
  t(
    'Multi-line input is supported by typing "\\" and pressing enter',
    '"\\" を入力して Enter を押すと、複数行入力ができます',
  ),
  t(
    "Use `cn ls` or `/resume` to resume a previous conversation",
    "`cn ls` または `/resume` で過去の会話を再開できます",
  ),
  t(
    'Run `cn` with the `-p` flag for headless mode. For example: `cn -p "Generate a commit message for the current changes. Output _only_ the commit message and nothing else."`',
    '`-p` フラグを付けた `cn` でヘッドレスモードが実行できます。例: `cn -p "現在の変更に対するコミットメッセージを生成して、コミットメッセージのみを出力して、他は一切出力しないでください。"`',
  ),
  t(
    "Use the /init slash command to generate an AGENTS.md file. This will help `cn` understand your codebase and generate better responses.",
    "/init スラッシュコマンドで AGENTS.md を生成できます。これにより `cn` がコードベースを理解し、より良い応答を生成します。",
  ),
];

interface TipsDisplayProps {
  // No props needed - component handles its own randomization
}

/**
 * Randomly selects and displays a tip from the CONTINUE_CLI_TIPS array.
 * Should only be shown 1 in 5 times (20% chance).
 */
const TipsDisplay: React.FC<TipsDisplayProps> = () => {
  // Randomly select a tip, memoized to prevent changing on re-renders
  const randomTip = useMemo(
    () =>
      CONTINUE_CLI_TIPS[Math.floor(Math.random() * CONTINUE_CLI_TIPS.length)],
    [],
  );

  return (
    <Box flexDirection="row" paddingX={1} paddingBottom={1}>
      <Text color="green" bold>
        {t("* Tip:", "* ヒント:")}
      </Text>
      <Text color="dim" italic>
        {" "}
        {randomTip}
      </Text>
      <Text> </Text>
    </Box>
  );
};

/**
 * Determines whether to show a tip (1 in 5 chance, 20% probability)
 */
export function shouldShowTip(): boolean {
  return Math.random() < 0.2; // 20% chance (1 in 5)
}

export { CONTINUE_CLI_TIPS, TipsDisplay };
