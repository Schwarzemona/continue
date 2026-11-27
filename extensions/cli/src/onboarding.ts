import * as fs from "fs";
import * as path from "path";

import chalk from "chalk";
import { setConfigFilePermissions } from "core/util/paths.js";

import type { AuthConfig } from "./auth/workos.js";
import { getApiClient } from "./config.js";
import { loadConfiguration } from "./configLoader.js";
import { env } from "./env.js";
import { t } from "./i18n.js";
import {
  getApiKeyValidationError,
  isValidAnthropicApiKey,
} from "./util/apiKeyValidation.js";
import { question } from "./util/prompt.js";
import {
  type ModelConfig,
  hasChatModel,
  setCustomModelInYaml,
  updateAnthropicModelInYaml,
} from "./util/yamlConfigUpdater.js";

const CONFIG_PATH = path.join(env.continueHome, "config.yaml");

export async function createOrUpdateConfig(apiKey: string): Promise<void> {
  const configDir = path.dirname(CONFIG_PATH);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const existingContent = fs.existsSync(CONFIG_PATH)
    ? fs.readFileSync(CONFIG_PATH, "utf8")
    : "";

  const updatedContent = updateAnthropicModelInYaml(existingContent, apiKey);
  fs.writeFileSync(CONFIG_PATH, updatedContent);
  setConfigFilePermissions(CONFIG_PATH);
}

export async function createOrUpdateCustomModel(
  model: ModelConfig,
): Promise<void> {
  const configDir = path.dirname(CONFIG_PATH);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const existingContent = fs.existsSync(CONFIG_PATH)
    ? fs.readFileSync(CONFIG_PATH, "utf8")
    : "";

  fs.writeFileSync(CONFIG_PATH, setCustomModelInYaml(existingContent, model));
  setConfigFilePermissions(CONFIG_PATH);
}

export async function runOnboardingFlow(
  configPath: string | undefined,
): Promise<boolean> {
  // Step 1: Check if --config flag is provided
  if (configPath !== undefined) {
    return false;
  }

  // Step 2: Check for CONTINUE_USE_BEDROCK environment variable first (before test env check)
  if (process.env.CONTINUE_USE_BEDROCK === "1") {
    console.log(
      chalk.blue(
        t(
          "✓ Using AWS Bedrock (CONTINUE_USE_BEDROCK detected)",
          "✓ AWS Bedrock を使用しています(CONTINUE_USE_BEDROCK を検出)",
        ),
      ),
    );
    return true;
  }

  // Step 3: Check if we're in a test/CI environment - if so, skip interactive prompts
  const isTestEnv =
    process.env.NODE_ENV === "test" ||
    process.env.CI === "true" ||
    process.env.VITEST === "true" ||
    process.env.GITHUB_ACTIONS === "true" ||
    !process.stdin.isTTY;

  if (isTestEnv) {
    // In test/CI environment, check for ANTHROPIC_API_KEY first
    if (process.env.ANTHROPIC_API_KEY) {
      console.log(
        chalk.blue(
          t(
            "✓ Using ANTHROPIC_API_KEY from environment",
            "✓ 環境変数 ANTHROPIC_API_KEY を使用しています",
          ),
        ),
      );
      await createOrUpdateConfig(process.env.ANTHROPIC_API_KEY);
      console.log(
        chalk.gray(
          t(
            `  Config saved to: ${CONFIG_PATH}`,
            `  設定を保存しました: ${CONFIG_PATH}`,
          ),
        ),
      );
      return false;
    }

    // Otherwise return a minimal working configuration
    return false;
  }

  // Step 4: If the existing config already declares a chat model, skip onboarding
  if (
    fs.existsSync(CONFIG_PATH) &&
    hasChatModel(fs.readFileSync(CONFIG_PATH, "utf8"))
  ) {
    console.log(
      chalk.blue(
        t(
          `✓ Using existing model configuration at ${CONFIG_PATH}`,
          `✓ 既存のモデル設定を使用しています: ${CONFIG_PATH}`,
        ),
      ),
    );
    return true;
  }

  // Step 5: Prompt for provider and credentials
  console.log(
    chalk.yellow(
      t(
        "To get started, choose a model provider:",
        "始めに、モデルプロバイダーを選択してください:",
      ),
    ),
  );
  console.log(
    t(
      "  1. Anthropic (sk-ant-... API key)",
      "  1. Anthropic (sk-ant-... APIキー)",
    ),
  );
  console.log(
    t(
      "  2. OpenAI-compatible endpoint (base URL + API key)",
      "  2. OpenAI互換エンドポイント(ベースURL + APIキー)",
    ),
  );
  console.log(
    t(
      "  3. Ollama (local models, no API key)",
      "  3. Ollama(ローカルモデル、APIキー不要)",
    ),
  );

  const choice = (
    await question(chalk.white(t("\nProvider [1]: ", "\nプロバイダー [1]: ")))
  ).trim();

  if (choice === "2" || choice === "3") {
    const isOllama = choice === "3";

    const apiBaseRaw = await question(
      isOllama
        ? chalk.white(
            t(
              "Ollama base URL [http://localhost:11434]: ",
              "OllamaのベースURL [http://localhost:11434]: ",
            ),
          )
        : chalk.white(
            t(
              "OpenAI-compatible base URL (e.g. https://api.openai.com/v1): ",
              "OpenAI互換のベースURL(例: https://api.openai.com/v1): ",
            ),
          ),
    );
    const apiBase =
      apiBaseRaw.trim() || (isOllama ? "http://localhost:11434" : "");
    if (!apiBase) {
      throw new Error(
        t(
          "A base URL is required for OpenAI-compatible models.",
          "OpenAI互換モデルにはベースURLが必須です。",
        ),
      );
    }

    const model = (
      await question(
        chalk.white(
          t("Model name (e.g. llama3.1:8b): ", "モデル名(例: llama3.1:8b): "),
        ),
      )
    ).trim();
    if (!model) {
      throw new Error(t("A model name is required.", "モデル名が必須です。"));
    }

    const apiKey = isOllama
      ? undefined
      : (
          await question(
            chalk.white(
              t("API key (leave empty to omit): ", "APIキー(空欄で省略): "),
            ),
          )
        ).trim() || undefined;

    await createOrUpdateCustomModel({
      name: `${isOllama ? "Ollama" : "Custom"} ${model}`,
      provider: isOllama ? "ollama" : "openai",
      model,
      apiBase,
      apiKey,
    });
    console.log(
      chalk.green(
        t(
          `✓ Config file updated successfully at ${CONFIG_PATH}`,
          `✓ 設定ファイルを更新しました: ${CONFIG_PATH}`,
        ),
      ),
    );
    return true;
  }

  const apiKey = await question(
    chalk.white(
      t(
        "\nEnter your Anthropic API key: ",
        "\nAnthropicのAPIキーを入力してください: ",
      ),
    ),
  );

  if (!isValidAnthropicApiKey(apiKey)) {
    throw new Error(getApiKeyValidationError(apiKey));
  }

  await createOrUpdateConfig(apiKey);
  console.log(
    chalk.green(
      t(
        `✓ Config file updated successfully at ${CONFIG_PATH}`,
        `✓ 設定ファイルを更新しました: ${CONFIG_PATH}`,
      ),
    ),
  );

  return true;
}

export async function isFirstTime(): Promise<boolean> {
  return !fs.existsSync(path.join(env.continueHome, ".onboarding_complete"));
}

export async function markOnboardingComplete(): Promise<void> {
  const flagPath = path.join(env.continueHome, ".onboarding_complete");
  const flagDir = path.dirname(flagPath);

  if (!fs.existsSync(flagDir)) {
    fs.mkdirSync(flagDir, { recursive: true });
  }

  fs.writeFileSync(flagPath, new Date().toISOString());
}

export async function initializeWithOnboarding(
  authConfig: AuthConfig,
  configPath: string | undefined,
) {
  const firstTime = await isFirstTime();

  if (configPath !== undefined) {
    // throw an early error is configPath is invalid or has errors
    try {
      await loadConfiguration(
        authConfig,
        configPath,
        getApiClient(undefined),
        [],
        false,
      );
    } catch (errorMessage) {
      throw new Error(
        t(
          `Failed to load config from "${configPath}": ${errorMessage}`,
          `"${configPath}" から設定を読み込めませんでした: ${errorMessage}`,
        ),
      );
    }
  }

  if (!firstTime) return;

  const wasOnboarded = await runOnboardingFlow(configPath);
  if (wasOnboarded) {
    await markOnboardingComplete();
  }
}
