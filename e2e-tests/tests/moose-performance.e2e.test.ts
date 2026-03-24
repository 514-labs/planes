import { describe, expect, it, afterAll } from "vitest";
import { getMooseUtils, toQueryPreview } from "@514labs/moose-lib";
import { standardQuery } from "./standard-queries";
import { createTestReporter } from "../helpers/test-reporter";
import {
  explain,
  profileBenchmark,
  type ProfileResult,
} from "../helpers/clickhouse-diagnostics";

const { client } = await getMooseUtils();
const { results, flush } = createTestReporter("benchmark-details");

function summarizeProfile(p: ProfileResult) {
  return {
    queryId: p.queryId,
    durationMs: p.durationMs,
    readRows: p.readRows,
    readBytes: p.readBytes,
    memoryUsage: p.memoryUsage,
    diskReadUs: p.diskReadUs,
  };
}

let baselineP95: number;

describe("Moose query performance", () => {
  afterAll(flush);

  it("baseline query (no filter) server-side p95 under 500ms", async () => {
    const query = standardQuery();
    const { profiles, p50, p95 } = await profileBenchmark(
      client.query,
      query.toSql(),
      12,
    );

    baselineP95 = p95;

    results.tests["baseline"] = {
      sql: toQueryPreview(query.toSql()),
      profiles: profiles.map(summarizeProfile),
      p50,
      p95,
    };

    console.log(
      `Baseline server-side p50: ${p50}ms, p95: ${p95}ms, samples: ${profiles.map((p) => `${p.durationMs}ms`).join(", ")}`,
    );
    expect(p95).toBeLessThanOrEqual(500);
  });

  it("filter variants do not regress vs baseline", async () => {
    expect(baselineP95, "Baseline test must run first").toBeDefined();

    const variants = [
      { name: "category=A3", build: () => standardQuery().filter("category", "eq", "A3") },
      {
        name: "altitude range",
        build: () => standardQuery().filter("altitude", "gte", 10000).filter("altitude", "lte", 30000),
      },
      {
        name: "speed range",
        build: () => standardQuery().filter("speed", "gte", 200).filter("speed", "lte", 500),
      },
      {
        name: "combined",
        build: () =>
          standardQuery()
            .filter("category", "eq", "A3")
            .filter("altitude", "gte", 10000)
            .filter("altitude", "lte", 30000)
            .filter("speed", "gte", 200)
            .filter("speed", "lte", 500),
      },
    ];

    const variantResults: Record<string, unknown> = {};

    for (const variant of variants) {
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
        profiles: profiles.map(summarizeProfile),
      };

      console.log(
        `${variant.name} server-side p95: ${p95}ms vs baseline ${baselineP95}ms`,
      );
      expect(
        p95,
        `${variant.name} p95 ${p95}ms > 2.5x baseline ${baselineP95}ms`,
      ).toBeLessThanOrEqual(baselineP95 * 2.5);
    }

    results.tests["filterRegression"] = variantResults;
  });

  it("category filter uses primary key index", async () => {
    const query = standardQuery().filter("category", "eq", "A3").toSql();
    const plan = await explain(client.query, query);

    results.tests["explainCategoryFilter"] = {
      sql: toQueryPreview(query),
      explain: plan,
    };

    console.log(
      `Index condition: ${plan.indexCondition}, granules: ${plan.selectedGranules}/${plan.totalGranules} (skip ${plan.granuleSkipPct}%)`,
    );
    expect(plan.indexCondition).not.toBe("true");
  });

  it("handles concurrent request burst without errors", async () => {
    const query = standardQuery().toSql();
    const concurrency = 10;

    const burstResults = await Promise.all(
      Array.from({ length: concurrency }, async () => {
        try {
          const result = await client.query.execute(query);
          await result.json();
          return { ok: true };
        } catch (e) {
          console.error("Concurrent request error:", e);
          return { ok: false };
        }
      }),
    );

    const errors = burstResults.filter((r) => !r.ok).length;

    results.tests["concurrentBurst"] = {
      concurrency,
      errors,
      errorRate: errors / burstResults.length,
      totalRequests: burstResults.length,
    };

    expect(errors).toBe(0);
  });

});
