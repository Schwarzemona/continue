import { detectLang, resetLangCache, t } from "./i18n.js";

describe("i18n", () => {
  const originalLang = process.env.CONTINUE_LANG;
  const originalVitest = process.env.VITEST;

  beforeEach(() => {
    resetLangCache();
    delete process.env.CONTINUE_LANG;
  });

  afterEach(() => {
    resetLangCache();
    if (originalLang === undefined) {
      delete process.env.CONTINUE_LANG;
    } else {
      process.env.CONTINUE_LANG = originalLang;
    }
    if (originalVitest !== undefined) {
      process.env.VITEST = originalVitest;
    }
  });

  describe("CONTINUE_LANG override", () => {
    it("returns the Japanese string when CONTINUE_LANG=ja", () => {
      process.env.CONTINUE_LANG = "ja";
      expect(detectLang()).toBe("ja");
      expect(t("Hello", "こんにちは")).toBe("こんにちは");
    });

    it("returns the English string when CONTINUE_LANG=en", () => {
      process.env.CONTINUE_LANG = "en";
      expect(detectLang()).toBe("en");
      expect(t("Hello", "こんにちは")).toBe("Hello");
    });

    it("accepts an uppercase override", () => {
      process.env.CONTINUE_LANG = "JA";
      expect(t("Hello", "こんにちは")).toBe("こんにちは");
    });

    it("ignores an unknown override and falls back to detection", () => {
      process.env.CONTINUE_LANG = "fr";
      // Under vitest the fallback is always English
      expect(detectLang()).toBe("en");
    });
  });

  describe("test environment", () => {
    it("uses English under vitest even for a Japanese locale", () => {
      process.env.VITEST = "true";
      expect(detectLang()).toBe("en");
      expect(t("Clear the chat history", "チャット履歴を消去する")).toBe(
        "Clear the chat history",
      );
    });
  });

  describe("caching", () => {
    it("caches the resolved language until resetLangCache is called", () => {
      process.env.CONTINUE_LANG = "ja";
      expect(t("Hello", "こんにちは")).toBe("こんにちは");

      // Changing the env var has no effect because the value is cached
      process.env.CONTINUE_LANG = "en";
      expect(t("Hello", "こんにちは")).toBe("こんにちは");

      resetLangCache();
      expect(t("Hello", "こんにちは")).toBe("Hello");
    });
  });
});
