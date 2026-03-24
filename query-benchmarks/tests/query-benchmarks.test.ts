import { describe, expect, it, afterAll } from "vitest";
import { getMooseUtils, toQueryPreview } from "@514labs/moose-lib";
import {
  explain,
  profileBenchmark,
  createTestReporter,
} from "@514labs/moose-lib/testing";
import { baseQuery, filterVariants } from "./benchmark-cases";

const { client } = await getMooseUtils();
const targetDb = process.env.MOOSE_CLICKHOUSE_CONFIG__DB_NAME ?? "local";
const { results, flush } = createTestReporter({
  prefix: `benchmark-${targetDb}`,
  outputDir: new URL("../reports", import.meta.url).pathname,
});

let baselineP95: number;

describe("Query benchmarks", () => {
  afterAll(async () => {
    const path = await flush();
    console.log(`\nBenchmark details: ${path}`);
  });

  it("baseline p95 under threshold", async () => {
    const query = baseQuery();
    const { profiles, p50, p95 } = await profileBenchmark(
      client.query,
      query.toSql(),
      12,
    );

    baselineP95 = p95;

    results.tests["baseline"] = {
      sql: toQueryPreview(query.toSql()),
      profiles,
      p50,
      p95,
    };

    console.log(`p50: ${p50}ms, p95: ${p95}ms, rows read: ${profiles[0]?.readRows}`);
    expect(p95).toBeLessThanOrEqual(500);
  });

  it("filter variants do not regress", async () => {
    expect(baselineP95, "Baseline must run first").toBeDefined();

    if (filterVariants.length === 0) return;

    const variantResults: Record<string, unknown> = {};

    for (const variant of filterVariants) {
      const query = variant.build();
      const { profiles, p50, p95 } = await profileBenchmark(
        client.query,
        query.toSql(),
        6,
      );

      variantResults[variant.name] = {
        sql: toQueryPreview(query.toSql()),
        p50,
        p95,
        baselineP95,
        ratio: p95 / baselineP95,
      };

      console.log(`${variant.name}: p95 ${p95}ms (${((p95 / baselineP95 - 1) * 100).toFixed(0)}% vs baseline)`);
      expect(
        p95,
        `${variant.name} p95 ${p95}ms > 2.5x baseline ${baselineP95}ms`,
      ).toBeLessThanOrEqual(baselineP95 * 2.5);
    }

    results.tests["filterRegression"] = variantResults;
  });

  it("EXPLAIN shows index usage", async () => {
    const query = baseQuery().toSql();
    const plan = await explain(client.query, query);

    results.tests["explain"] = {
      sql: toQueryPreview(query),
      explain: plan,
    };

    console.log(`index: ${plan.indexCondition}, granules: ${plan.selectedGranules}/${plan.totalGranules} (${plan.granuleSkipPct}% skip)`);
    expect(plan.indexCondition).not.toBe("true");
  });
});
