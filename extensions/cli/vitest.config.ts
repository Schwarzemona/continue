import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Chalk/ink detect color support from the actual TTY, so assertions that
    // compare plain strings pass in CI but fail when run in a color terminal.
    // Pin color level for deterministic output everywhere.
    env: {
      FORCE_COLOR: "0",
    },
    setupFiles: ["./vitest.global-dir-setup.ts", "./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.e2e.*", "**/e2e/**"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/test-helpers/**",
        "**/types/**",
        "**/__mocks__/**",
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, "src"),
    },
    extensions: [".js", ".ts", ".tsx", ".json"],
  },
});
