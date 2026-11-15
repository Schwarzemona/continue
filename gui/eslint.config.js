import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import noBarrelFiles from "eslint-plugin-no-barrel-files";
import globals from "globals";

/**
 * ESLint flat config for `gui`.
 *
 * flat config 移行前（`.eslintrc.json`）では `eslint:recommended` /
 * `plugin:@typescript-eslint/recommended` 群はすべてコメントアウトされており、
 * 実効的なルールは `no-barrel-files` と `no-floating-promises` のみだった。
 * 移行時に recommended 群が有効化されて大量の既存違反が露出したため、
 * 厳格さは移行前と同じ水準に戻している。厳格化はルール単位で行うこと。
 */
export default tseslint.config(
  {
    files: ["**/*.{js,cjs,mjs,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.node.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react: reactPlugin,
      "no-barrel-files": noBarrelFiles,
      "@typescript-eslint": tseslint.plugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "@typescript-eslint/naming-convention": "off",
      "@typescript-eslint/no-floating-promises": "warn",
      // 既存の barrel ファイル群は未整理のため、error から warn に緩和している。
      // 整理が進んだら error に戻す。
      "no-barrel-files/no-barrel-files": "warn",
    },
  },
  {
    ignores: ["dist/**/*"],
  },
);
