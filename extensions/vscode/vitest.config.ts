import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.vitest.ts"],
    environment: "node",
    // svg-builder's ESM build uses extensionless directory imports (e.g.
    // `import './content'`), which Node's own ESM loader rejects when the
    // dependency is externalized. Let vite resolve/transform it instead.
    server: {
      deps: {
        inline: [/svg-builder/],
      },
    },
  },
});
