import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    timeout: 10000,
    globals: true,
    // ビルド成果物である dist/ をテスト対象から除外する。
    // dist の *.test.js は `./certs.js` などの相対 import を持つため、
    // 下記の alias（.js → .ts）と衝突して解決に失敗する。
    include: ["src/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    exclude: [...configDefaults.exclude, "dist/**"],
  },
  resolve: {
    alias: {
      // Handle .js imports for TypeScript files
      "./getAgentOptions.js": "./getAgentOptions.ts",
      "./stream.js": "./stream.ts",
      "./util.js": "./util.ts",
      "./certs.js": "./certs.ts",
      "./fetch.js": "./fetch.ts",
    },
  },
});
