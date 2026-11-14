import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for the server side of the site (API routes, the MCP endpoint, validation). Browser journeys are
// Playwright specs under e2e/ and run with `pnpm test:e2e`.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    extensions: [".ts", ".tsx", ".js", ".mjs", ".json"]
  },
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next*/**", ".open-next/**"],
    environment: "node"
  }
});
