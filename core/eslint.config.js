import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import tsParser from "@typescript-eslint/parser";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
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
    },
    rules: {
      quotes: ["off", "double", {}],
      "@typescript-eslint/naming-convention": "off",
      "@typescript-eslint/no-floating-promises": "error",
      "import/order": "off",
      curly: "off",
      "@typescript-eslint/semi": "off",
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
