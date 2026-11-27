import { t } from "../i18n.js";

/**
 * Validates an Anthropic API key format
 * @param apiKey The API key to validate
 * @returns true if the API key is valid, false otherwise
 */
export function isValidAnthropicApiKey(
  apiKey: string | null | undefined,
): boolean {
  if (!apiKey || typeof apiKey !== "string") {
    return false;
  }

  // Anthropic API keys must start with "sk-ant-" and have additional characters
  return apiKey.startsWith("sk-ant-") && apiKey.length > "sk-ant-".length;
}

/**
 * Gets a user-friendly error message for invalid API keys
 * @param apiKey The API key that failed validation
 * @returns A descriptive error message
 */
export function getApiKeyValidationError(
  apiKey: string | null | undefined,
): string {
  if (!apiKey || typeof apiKey !== "string") {
    return t("API key is required", "APIキーが必須です");
  }

  if (!apiKey.startsWith("sk-ant-")) {
    return t(
      'API key must start with "sk-ant-"',
      'APIキーは "sk-ant-" で始まる必要があります',
    );
  }

  if (apiKey.length <= "sk-ant-".length) {
    return t("API key is too short", "APIキーが短すぎます");
  }

  return t("Invalid API key format", "APIキーの形式が不正です");
}
