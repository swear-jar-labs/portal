import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@swearjar/dos": fileURLToPath(new URL("./src/packages/swearjar-dos", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    css: { modules: { classNameStrategy: "non-scoped" } },
    include: ["tests/unit/**/*.test.{ts,tsx}", "src/packages/*/tests/**/*.test.ts"],
  },
});
