import { describe, expect, it, afterAll } from "vitest";
import { getMooseUtils, toQueryPreview } from "@514labs/moose-lib";
import { baseQuery, filterVariants } from "./benchmark-cases";
import { createReportWriter } from "../reporting/report-writer";

const { client } = await getMooseUtils();
const { results, flush } = createReportWriter("benchmark-details");

// Moose-lib diagnostic helpers (available once shipped on QueryClient)
// For now, import from moose-lib or use temporary helpers
const { explain, profileBenchmark, dataChecksum } = await import(
  "@514labs/moose-lib"
).then((m) => ({
  explain: m.explain ?? (async () => { throw new Error("explain() not yet available in moose-lib — add a local helper"); }),
  profileBenchmark: m.profileBenchmark ?? (async () => { throw new Error("profileBenchmark() not yet available in moose-lib — add a local helper"); }),
  dataChecksum: m.dataChecksum ?? (async () => { throw new Error("dataChecksum() not yet available in moose-lib — add a local helper"); }),
}));

let baselineP95: number;

describe("Query benchmarks", () => {
  afterAll(flush);

  it("data checksum", async () => {
    const checksum = await dataChecksum(client.query);
    results.tests["dataChecksum"] = checksum;

    console.log(
      `Rows: ${checksum.rows}, checksum: ${checksum.checksum}`,
    );
    expect(checksum.rows).toBeGreaterThan(0);
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

    console.log(
      `Baseline p50: ${p50}ms, p95: ${p95}ms`,
    );
    expect(p95).toBeLessThanOrEqual(500);
  });

  it("filter variants do not regress", async () => {
    expect(baselineP95, "Baseline must run first").toBeDefined();

    if (filterVariants.length === 0) {
      console.log("No filter variants defined — skipping");
      return;
    }

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

      console.log(
        `${variant.name} p95: ${p95}ms vs baseline ${baselineP95}ms`,
      );
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

    console.log(
      `Index: ${plan.indexCondition}, granules: ${plan.selectedGranules}/${plan.totalGranules} (skip ${plan.granuleSkipPct}%)`,
    );
    expect(plan.indexCondition).not.toBe("true");
  });

  it("concurrent burst without errors", async () => {
    const query = baseQuery().toSql();
    const concurrency = 10;

    const burstResults = await Promise.all(
      Array.from({ length: concurrency }, async () => {
        try {
          const result = await client.query.execute(query);
          await result.json();
          return { ok: true };
        } catch {
          return { ok: false };
        }
      }),
    );

    const errors = burstResults.filter((r) => !r.ok).length;

    results.tests["concurrentBurst"] = {
      concurrency,
      errors,
      totalRequests: burstResults.length,
    };

    expect(errors).toBe(0);
  });
});
