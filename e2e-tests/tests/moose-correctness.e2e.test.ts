import { describe, expect, it, afterAll } from "vitest";
import { getMooseUtils } from "@514labs/moose-lib";
import { standardQuery } from "./standard-queries";
import { createTestReporter } from "../helpers/test-reporter";
import { tableStats } from "../helpers/clickhouse-diagnostics";
import { saveSnapshot, compareSnapshot } from "../helpers/snapshot";

const { client } = await getMooseUtils();
const { results, flush } = createTestReporter("correctness-details");

describe("Moose query correctness", () => {
  afterAll(flush);

  it("table has data", async () => {
    const stats = await tableStats(
      client.query,
      "AircraftTrackingProcessedTable",
    );

    results.tests["tableStats"] = stats;

    console.log(
      `Table: ${stats.table}, rows: ${stats.rows}, parts: ${stats.parts}, disk: ${stats.diskSize}`,
    );
    expect(stats.rows).toBeGreaterThan(0);
  });

  it("query results match saved snapshot", async () => {
    const query = standardQuery()
      .filter("timestamp", "lt", "2026-03-16T00:00:00")
      .toSql();

    const result = await client.query.execute(query);
    const rows = (await result.json()) as unknown[];
    expect(rows.length, "No rows in snapshot time range").toBeGreaterThan(0);

    let comparison;
    try {
      comparison = await compareSnapshot("aircraftStats-baseline", rows);
    } catch {
      const path = await saveSnapshot("aircraftStats-baseline", rows);
      console.log(`Created snapshot at ${path} (${rows.length} rows)`);
      results.tests["snapshot"] = { status: "created", rowCount: rows.length };
      return;
    }

    results.tests["snapshot"] = comparison;

    console.log(
      `Snapshot: ${comparison.match ? "MATCH" : "MISMATCH"}, ` +
        `rows: ${comparison.actualRowCount} (expected ${comparison.expectedRowCount})`,
    );
    expect(comparison.match, "Query results changed").toBe(true);
  });
});
