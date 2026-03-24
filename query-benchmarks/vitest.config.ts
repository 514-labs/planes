import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      // TODO: Update path to point at your Moose project's compiled output
      "planes-moose": resolve(__dirname, "../moose/dist/app"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 120000,
    reporters: ["default", "json"],
    outputFile: {
      json: "./reports/test-results.json",
    },
  },
});
