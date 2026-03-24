/**
 * Test report accumulator — collects results from test cases
 * and writes a timestamped JSON detail file.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface TestReport {
  timestamp: string;
  target: { host: string; database: string };
  tests: Record<string, unknown>;
}

export function createTestReporter(prefix: string): {
  results: TestReport;
  flush: () => Promise<void>;
} {
  const results: TestReport = {
    timestamp: new Date().toISOString(),
    target: {
      host: process.env.MOOSE_CLICKHOUSE_CONFIG__HOST ?? "localhost",
      database: process.env.MOOSE_CLICKHOUSE_CONFIG__DB_NAME ?? "local",
    },
    tests: {},
  };

  const flush = async () => {
    const reportsDir = join(import.meta.dirname, "..", "reports");
    await mkdir(reportsDir, { recursive: true });
    const dbName = results.target.database;
    const filename = `${prefix}-${dbName}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    await writeFile(
      join(reportsDir, filename),
      JSON.stringify(results, null, 2),
    );
    console.log(`\nResults written to reports/${filename}`);
  };

  return { results, flush };
}
