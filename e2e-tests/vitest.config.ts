import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "planes-moose": resolve(__dirname, "../moose/dist/app"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.e2e.test.ts"],
    testTimeout: 120000,
    reporters: ["default", "json"],
    outputFile: {
      json: "./reports/benchmark-results.json",
    },
  },
});
