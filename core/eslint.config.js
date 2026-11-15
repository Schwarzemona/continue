import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import tsParser from "@typescript-eslint/parser";

export default tseslint.config(
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      // 移行前 (.eslintrc.json / .eslintrc.shared.json) と同等の厳格さを保つ。
      // eslint.configs.recommended / tseslint.configs.recommended は移行前には
      // 有効でなかったため、ここでも適用しない（厳格化はルール単位で行う）。
      "no-negated-condition": "warn",
      "no-throw-literal": "warn",
      "@typescript-eslint/naming-convention": "off",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/semi": "off",
      "import/order": "off",
      quotes: ["off", "double", {}],
      curly: "off",
      semi: "off",
      eqeqeq: "error",
      complexity: ["error", { max: 36 }],
      "max-lines-per-function": ["error", { max: 500 }],
      "max-statements": ["error", { max: 108 }],
      "max-depth": ["error", { max: 6 }],
      "max-nested-callbacks": ["error", { max: 4 }],
      "max-params": ["error", { max: 8 }],
    },
  },
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/*.vitest.ts",
    ],
    rules: {
      "max-lines-per-function": "off",
    },
  },
  {
    ignores: ["out", "dist", "**/*.d.ts"],
  },
);
