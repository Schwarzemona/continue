import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

import { parseMarkdownRule, RuleObject } from "@continuedev/config-yaml";

import { env } from "./env.js";
import { processRule } from "./hubLoader.js";
import { PermissionMode } from "./permissions/types.js";
import { serviceContainer } from "./services/ServiceContainer.js";
import { ConfigServiceState, SERVICE_NAMES } from "./services/types.js";

/**
 * Check if current directory is a git repository
 */
function isGitRepo(): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get git status
 */
function getGitStatus(): string {
  try {
    if (!isGitRepo()) {
      return "gitリポジトリではありません";
    }
    const result = execSync("git status --porcelain", {
      encoding: "utf-8",
      cwd: process.cwd(),
    });
    return result.trim() || "作業ツリーはクリーンです";
  } catch {
    return "git ステータスを利用できません";
  }
}

const baseSystemMessage = `あなたは Continue CLI のエージェントです。ユーザーのプロンプトを受け、利用可能なツールを使ってユーザーの質問に回答してください。

注意事項:
1. 重要: 回答はコマンドラインインターフェースに表示されるため、簡潔で直接的、要点を絞ってください。
2. 質問に関連するファイル名やコードスニペットがあれば、それを共有してください
あなたは現在次の環境で実行しています:
<env>
Working directory: ${process.cwd()}
Is directory a git repo: ${isGitRepo()}
Platform: ${process.platform}
Today's date: ${new Date().toISOString().split("T")[0]}
</env>

ユーザーの質問に回答する際は、次のコンテキストを利用できます:

<context name="gitStatus">これは会話開始時点の git ステータスです。このステータスは時点のスナップショットであり、会話中は更新されないことに注意してください。

${getGitStatus()}
</context>`;

async function getConfigYamlRules(): Promise<string[]> {
  const configState = await serviceContainer.get<ConfigServiceState>(
    SERVICE_NAMES.CONFIG,
  );
  if (configState.config?.rules) {
    // Extract systemMessage from the config if it exists
    const rules = configState.config.rules;
    return rules
      .map((rule) => {
        return typeof rule === "string" ? rule : rule?.rule;
      })
      .filter((rule): rule is string => !!rule);
  }

  return [];
}

function getRuleNameFromPath(filePath: string): string {
  const segments = filePath.split(/[/\\]/);
  const lastTwoParts = segments.slice(-2);
  return lastTwoParts.filter(Boolean).join("/").replace(/\.md$/, "");
}

/**
 * Scan .continue/rules/ directories for markdown rule files and return the rules with metadata that should be always-applied
 */
export function loadMarkdownRulesWithMetadata(): RuleObject[] {
  const cwd = process.cwd();
  const rulesDirs = [
    path.join(cwd, ".continue", "rules"),
    path.join(env.continueHome, "rules"),
  ];

  const rules: RuleObject[] = [];

  for (const dir of rulesDirs) {
    if (!fs.existsSync(dir)) continue;

    let files: string[];
    try {
      files = fs.readdirSync(dir, { recursive: true }) as string[];
    } catch {
      continue;
    }

    for (const file of files) {
      if (!String(file).endsWith(".md")) continue;

      const filePath = path.join(dir, String(file));
      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) continue;
      } catch {
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const { frontmatter, markdown } = parseMarkdownRule(content);

        if (frontmatter.invokable) continue;

        const isAlwaysApply =
          frontmatter.alwaysApply === true ||
          (frontmatter.alwaysApply === undefined &&
            !frontmatter.globs &&
            !frontmatter.regex);

        if (isAlwaysApply && markdown.trim()) {
          const ruleName =
            frontmatter.name || getRuleNameFromPath(String(file));
          rules.push({
            name: ruleName,
            rule: markdown,
            description: frontmatter.description,
            globs: frontmatter.globs,
            regex: frontmatter.regex,
            alwaysApply: true,
            sourceFile: filePath,
          });
        }
      } catch {
        // Skip files that can't be read or parsed
      }
    }
  }

  return rules;
}

/**
 * Load and construct a comprehensive system message with base message and rules section
 * @param additionalRules - Additional rules from --rule flags
 * @param format - Output format for headless mode
 * @param headless - Whether running in headless mode
 * @param mode - Current permission mode
 * @returns The comprehensive system message with base message and rules section
 */
export async function constructSystemMessage(
  mode: PermissionMode,
  additionalRules?: string[],
  format?: "json",
  headless?: boolean,
): Promise<string> {
  const agentFiles = ["AGENTS.md", "AGENT.md", "CLAUDE.md", "CODEX.md"];

  let agentContent = "";

  try {
    for (const fileName of agentFiles) {
      const filePath = path.join(process.cwd(), fileName);

      if (fs.existsSync(filePath)) {
        agentContent = fs.readFileSync(filePath, "utf-8");
        break; // Use the first found agent file
      }
    }
  } catch (error) {
    // If there's any error reading the file, continue without agent content
    console.warn("Warning: Could not read agent configuration file:", error);
  }

  // Process additional rules from --rule flags
  const processedRules: string[] = [];
  if (additionalRules && additionalRules.length > 0) {
    for (const ruleSpec of additionalRules) {
      try {
        const processedRule = await processRule(ruleSpec);
        processedRules.push(processedRule);
      } catch (error: any) {
        console.warn(
          `Warning: Failed to process rule "${ruleSpec}": ${error.message}`,
        );
      }
    }
  }

  const configYamlRules = await getConfigYamlRules();
  processedRules.push(...configYamlRules);

  // Load markdown rules from .continue/rules/ directories
  const markdownRules = loadMarkdownRulesWithMetadata();
  // Deduplicate against already-loaded rules
  const existingRulesSet = new Set(processedRules);
  for (const rule of markdownRules) {
    if (!existingRulesSet.has(rule.rule)) {
      processedRules.push(rule.rule);
      existingRulesSet.add(rule.rule);
    }
  }

  // Construct the comprehensive system message
  let systemMessage = baseSystemMessage;

  // Add plan mode specific instructions if in plan mode
  if (mode === "plan") {
    systemMessage +=
      '\n<context name="planMode">あなたは _Plan Mode_ で動作しています。これは、行動を起こす前にユーザーのアイデアの調査と計画の立案を支援することが目標であることを意味します。読み取り専用ツールのみ利用可能で、これらを迂回してファイルの書き込み / 削除 / 作成を試みてはいけません。変更を望む場合は、ユーザーに agent mode への切り替えを依頼してください。例えば、Bash ツールを使ってファイルに書き込むことは許容されません。</context>\n';
  } else {
    // Check if commit signature is disabled via environment variable
    if (!process.env.CONTINUE_CLI_DISABLE_COMMIT_SIGNATURE) {
      systemMessage += `\n<context name="commitSignature">CLI やツールを使ってコミットを作成する際は、コミットメッセージに以下を含めてください:
Generated with [Continue](https://continue.dev)

Co-Authored-By: Continue <noreply@continue.dev>
</context>\n`;
    }
  }

  // In headless mode, add instructions to be concise and only provide final answers
  if (headless) {
    systemMessage += `

重要: あなたは headless モードで実行しています。ユーザーの質問への最終回答のみを提供してください。明確に要求されない限り、説明・推論・追加のコメントは含めないでください。直接的かつ簡潔に回答してください。`;
  }

  // Add JSON formatting instructions if format is json
  if (format === "json") {
    systemMessage += `

重要: あなたは JSON 出力モードで動作しています。最終応答は JSON.parse() で解析可能な有効な JSON でなければなりません。JSON にはユーザーの質問に回答するためのプロパティを含めてください。一般的な "response" や "answer" フィールドを含める必要はありません。JSON の前後にテキストを含めないでください — 応答全体が解析可能な JSON である必要があります。

応答形式の例:
{
  "property": "value"
}`;
  }

  // Add rules section if we have any rules or agent content
  if (agentContent || processedRules.length > 0) {
    systemMessage += '\n\n<context name="userRules">';

    if (agentContent) {
      systemMessage += `\n${agentContent}`;
    }

    // Add processed rules from --rule flags
    if (processedRules.length > 0) {
      const separator = agentContent ? "\n\n" : "\n";
      systemMessage += `${separator}${processedRules.join("\n\n")}`;
    }

    systemMessage += "\n</context>";
  }

  return systemMessage;
}
