/**
 * Lightweight i18n: user-visible strings are written inline as
 * `t("English text", "日本語テキスト")` so both locales live next to each
 * other in the source. Language is auto-detected from the system locale and
 * can be overridden with CONTINUE_LANG=en|ja. Tests always use English so
 * existing text assertions keep working.
 */

export type Lang = "en" | "ja";

let cached: Lang | undefined;

/** Safely reads process.env (some tests stub the global `process` object). */
function readEnv(key: string): string | undefined {
  try {
    const env = (globalThis as any)?.process?.env;
    if (!env || typeof env !== "object") {
      return undefined;
    }
    const value = env[key];
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

export function detectLang(): Lang {
  if (cached) {
    return cached;
  }

  const override = readEnv("CONTINUE_LANG")?.toLowerCase();
  if (override === "ja" || override === "en") {
    cached = override;
    return cached;
  }

  // Keep test runs deterministic (English), regardless of the developer's OS locale.
  if (
    readEnv("VITEST") === "true" ||
    readEnv("NODE_ENV") === "test" ||
    readEnv("CI") === "true"
  ) {
    cached = "en";
    return cached;
  }

  const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? "en";
  cached = locale.toLowerCase().startsWith("ja") ? "ja" : "en";
  return cached;
}

export function t(en: string, ja: string): string {
  return detectLang() === "ja" ? ja : en;
}

/** Reset the cached locale (used by tests that toggle CONTINUE_LANG). */
export function resetLangCache(): void {
  cached = undefined;
}
