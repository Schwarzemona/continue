import * as fs from "fs";
import * as path from "path";

import chalk from "chalk";
import { setConfigFilePermissions } from "core/util/paths.js";

import type { AuthConfig } from "./auth/workos.js";
import { getApiClient } from "./config.js";
import { loadConfiguration } from "./configLoader.js";
import { env } from "./env.js";
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
      chalk.blue("✓ Using AWS Bedrock (CONTINUE_USE_BEDROCK detected)"),
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
      console.log(chalk.blue("✓ Using ANTHROPIC_API_KEY from environment"));
      await createOrUpdateConfig(process.env.ANTHROPIC_API_KEY);
      console.log(chalk.gray(`  Config saved to: ${CONFIG_PATH}`));
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
      chalk.blue(`✓ Using existing model configuration at ${CONFIG_PATH}`),
    );
    return true;
  }

  // Step 5: Prompt for provider and credentials
  console.log(chalk.yellow("To get started, choose a model provider:"));
  console.log("  1. Anthropic (sk-ant-... API key)");
  console.log("  2. OpenAI-compatible endpoint (base URL + API key)");
  console.log("  3. Ollama (local models, no API key)");

  const choice = (await question(chalk.white("\nProvider [1]: "))).trim();

  if (choice === "2" || choice === "3") {
    const isOllama = choice === "3";

    const apiBaseRaw = await question(
      isOllama
        ? chalk.white("Ollama base URL [http://localhost:11434]: ")
        : chalk.white(
            "OpenAI-compatible base URL (e.g. https://api.openai.com/v1): ",
          ),
    );
    const apiBase =
      apiBaseRaw.trim() || (isOllama ? "http://localhost:11434" : "");
    if (!apiBase) {
      throw new Error("A base URL is required for OpenAI-compatible models.");
    }

    const model = (
      await question(chalk.white("Model name (e.g. llama3.1:8b): "))
    ).trim();
    if (!model) {
      throw new Error("A model name is required.");
    }

    const apiKey = isOllama
      ? undefined
      : (
          await question(chalk.white("API key (leave empty to omit): "))
        ).trim() || undefined;

    await createOrUpdateCustomModel({
      name: `${isOllama ? "Ollama" : "Custom"} ${model}`,
      provider: isOllama ? "ollama" : "openai",
      model,
      apiBase,
      apiKey,
    });
    console.log(
      chalk.green(`✓ Config file updated successfully at ${CONFIG_PATH}`),
    );
    return true;
  }

  const apiKey = await question(
    chalk.white("\nEnter your Anthropic API key: "),
  );

  if (!isValidAnthropicApiKey(apiKey)) {
    throw new Error(getApiKeyValidationError(apiKey));
  }

  await createOrUpdateConfig(apiKey);
  console.log(
    chalk.green(`✓ Config file updated successfully at ${CONFIG_PATH}`),
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
        `Failed to load config from "${configPath}": ${errorMessage}`,
      );
    }
  }

  if (!firstTime) return;

  const wasOnboarded = await runOnboardingFlow(configPath);
  if (wasOnboarded) {
    await markOnboardingComplete();
  }
}
