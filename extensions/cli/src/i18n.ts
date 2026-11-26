/**
 * Lightweight i18n: user-visible strings are written inline as
 * `t("English text", "日本語テキスト")` so both locales live next to each
 * other in the source. Language is auto-detected from the system locale and
 * can be overridden with CONTINUE_LANG=en|ja. Tests always use English so
 * existing text assertions keep working.
 */

export type Lang = "en" | "ja";

let cached: Lang | undefined;

export function detectLang(): Lang {
  if (cached) {
    return cached;
  }

  const override = process.env.CONTINUE_LANG?.toLowerCase();
  if (override === "ja" || override === "en") {
    cached = override;
    return cached;
  }

  // Keep test runs deterministic (English), regardless of the developer's OS locale.
  if (
    process.env.VITEST === "true" ||
    process.env.NODE_ENV === "test" ||
    process.env.CI === "true"
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
