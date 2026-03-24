/**
 * Benchmark report writer.
 * Collects test results and writes a timestamped JSON file.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface BenchmarkReport {
  timestamp: string;
  target: { host: string; database: string };
  tests: Record<string, unknown>;
}

export function createReportWriter(prefix: string): {
  results: BenchmarkReport;
  flush: () => Promise<void>;
} {
  const database = process.env.MOOSE_CLICKHOUSE_CONFIG__DB_NAME ?? "local";

  const results: BenchmarkReport = {
    timestamp: new Date().toISOString(),
    target: {
      host: process.env.MOOSE_CLICKHOUSE_CONFIG__HOST ?? "localhost",
      database,
    },
    tests: {},
  };

  const flush = async () => {
    const reportsDir = join(import.meta.dirname, "..", "reports");
    await mkdir(reportsDir, { recursive: true });
    const filename = `${prefix}-${database}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    await writeFile(
      join(reportsDir, filename),
      JSON.stringify(results, null, 2),
    );
    console.log(`\nReport: reports/${filename}`);
  };

  return { results, flush };
}
