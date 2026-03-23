# ClickHouse Query Benchmarking for MooseStack

## Problem

When you change anything that touches ClickHouse — schema, ORDER BY, materialized views, new columns, data migrations — there's no systematic way to know if your queries still work correctly and perform acceptably before shipping to production.

Today the process is manual: push a branch, wait for a preview deployment, manually run EXPLAIN plans and timed queries, copy results into a PR description. This is slow, error-prone, and not reproducible.

## Solution

Two new methods on `QueryClient` in `@514labs/moose-lib` — `client.query.explain()` and `client.query.benchmark()` — that let you test your actual query builder functions against any deployed ClickHouse target from a standard vitest test.

No new CLI commands. No benchmark framework. No config files. No extra imports. Just the MooseClient you already have + vitest + environment variables.

## New Methods on `QueryClient`

These sit alongside the existing `client.query.execute()` and `client.query.command()` methods.

### `client.query.explain(query)`

Runs `EXPLAIN indexes=1` on a Sql object and returns a parsed result.

```typescript
const { client, sql } = await getMooseUtils();
const query = buildAircraftStatsQuery(sql, columns, { category: "A3" });
const plan = await client.query.explain(query);

// plan.indexCondition    → "category in ['A3']"
// plan.selectedGranules  → 6
// plan.totalGranules     → 24
// plan.granuleSkipPct    → 75
// plan.rawPlan           → full EXPLAIN output string
```

**Implementation:** Takes the Sql object, prepends `EXPLAIN indexes = 1` via `toStaticQuery()`, executes via `this.execute()`, parses the text output for `Condition:`, `Granules:`, and `Parts:` lines.

**Return type:**

```typescript
interface ExplainResult {
  indexCondition: string;
  selectedGranules: number;
  totalGranules: number;
  granuleSkipPct: number;
  rawPlan: string;
}
```

### `client.query.benchmark(query, options)`

Runs a query multiple times with warmup and returns timing statistics.

```typescript
const { client, sql } = await getMooseUtils();
const query = buildAircraftStatsQuery(sql, columns, { category: "A3" });
const stats = await client.query.benchmark(query, { warmup: 2, runs: 5 });

// stats.p50     → 91
// stats.p95     → 105
// stats.min     → 87
// stats.max     → 113
// stats.samples → [89, 91, 93, 105, 87]
```

**Implementation:** Uses `this.execute()` with `performance.now()` for timing. Runs `warmup` iterations (results discarded), then `runs` timed iterations. Computes percentiles from the timed samples.

**Return type:**

```typescript
interface BenchmarkResult {
  p50: number;
  p95: number;
  min: number;
  max: number;
  samples: number[];
}
```

### `client.query.estimate(query)`

Returns estimated rows and bytes the query would touch *without executing it*. Runs `EXPLAIN ESTIMATE` under the hood. Shows index selectivity impact — a more intuitive metric than granule counts for developers who don't think in ClickHouse internals.

```typescript
const estimate = await client.query.estimate(query);

// estimate.estimatedRows  → 12000000
// estimate.estimatedBytes → 450000000
```

**Implementation:** Prepends `EXPLAIN ESTIMATE` to the query, parses the output for `rows` and `bytes` columns.

**Return type:**

```typescript
interface EstimateResult {
  estimatedRows: number;
  estimatedBytes: number;
}
```

### `client.query.profile(query)`

Executes the query and reads back resource consumption from `system.query_log`. Captures what `benchmark()` misses: rows read, bytes scanned, memory usage. These explain *why* something is faster, not just that it is. A schema change might not reduce latency (ClickHouse is already parallel) but dramatically reduce memory and bytes — which matters for cost and concurrency at scale.

```typescript
const profile = await client.query.profile(query);

// profile.readRows     → 12000000
// profile.readBytes    → 450000000
// profile.memoryUsage  → 64000000
// profile.durationMs   → 105
// profile.resultRows   → 29
```

**Implementation:** Executes the query with a unique `query_id`, waits briefly for `system.query_log` to flush, then reads back the log entry for that `query_id`.

**Return type:**

```typescript
interface ProfileResult {
  readRows: number;
  readBytes: number;
  memoryUsage: number;
  durationMs: number;
  resultRows: number;
}
```

### `client.table.storageStats(table)`

Queries `system.parts` for compression ratio, bytes per row, part count, and disk size. Shows the storage impact of type changes (LowCardinality, smaller int types, removing Nullable).

```typescript
const storage = await client.table.storageStats("AircraftTrackingProcessedTable");

// storage.rows             → 48000000
// storage.bytesOnDisk      → 1690000000
// storage.bytesPerRow      → 37.2
// storage.compressionRatio → 3.2
// storage.parts            → 12
```

**Implementation:** Queries `system.parts WHERE active = 1 AND table = <table>`, aggregates `sum(rows)`, `sum(bytes_on_disk)`, `sum(data_uncompressed_bytes)`, `count()`.

**Return type:**

```typescript
interface StorageStats {
  table: string;
  rows: number;
  bytesOnDisk: number;
  bytesPerRow: number;
  compressionRatio: number;
  parts: number;
}
```

### `client.query.pipeline(query)` (future)

Runs `EXPLAIN PIPELINE` to show execution stages and parallelism degree. Useful for understanding how ClickHouse executes the query — number of processing threads, aggregation stages, sort stages. Lower priority than the above because it's harder to interpret and less actionable.

### `client.table.mergeStatus(table)` (future)

Polls `system.merges` to check if background merges are in progress for a table. Call this before benchmarking to ensure the table has settled after a schema change or data load. Prevents noisy benchmark results from in-flight merge activity.

## How It Works

You write a vitest test that imports your query builder functions from your app code and uses the new helpers to test them. The test uses the same `getMooseUtils()` client you use everywhere else in your Moose app.

```typescript
// e2e-tests/tests/schema-benchmark.e2e.test.ts
import { describe, expect, it } from "vitest";
import { getMooseUtils } from "@514labs/moose-lib";
import { AircraftTrackingProcessed_Table } from "planes-moose";
import { buildAircraftStatsQuery } from "../moose/app/apis/aircraftSpeedAltitudeByType";

const { client, sql } = await getMooseUtils();
const columns = AircraftTrackingProcessed_Table.columns;

describe("Schema optimization", () => {
  it("category filter uses primary key", async () => {
    const query = buildAircraftStatsQuery(sql, columns, { category: "A3" });
    const plan = await client.query.explain(query);

    expect(plan.indexCondition).not.toBe("true");
    expect(plan.granuleSkipPct).toBeGreaterThan(50);
  });

  it("category filter p95 under 500ms", async () => {
    const query = buildAircraftStatsQuery(sql, columns, { category: "A3" });
    const stats = await client.query.benchmark(query, { warmup: 2, runs: 5 });

    expect(stats.p95).toBeLessThan(500);
  });

  it("no filter completes under 2000ms", async () => {
    const query = buildAircraftStatsQuery(sql, columns, {});
    const stats = await client.query.benchmark(query, { warmup: 2, runs: 5 });

    expect(stats.p95).toBeLessThan(2000);
  });

  it("combined filters skip granules", async () => {
    const query = buildAircraftStatsQuery(sql, columns, {
      category: "A3",
      minAltitude: 10000,
      maxAltitude: 30000,
      minSpeed: 200,
      maxSpeed: 500,
    });
    const plan = await client.query.explain(query);

    expect(plan.granuleSkipPct).toBeGreaterThan(50);
  });
});
```

## Targeting Different Deployments

The same test file runs against any ClickHouse target. `getMooseUtils()` reads connection details from `MOOSE_CLICKHOUSE_CONFIG__*` environment variables (existing open-source moose-lib behavior). The 514 commercial platform provides two ways to inject these automatically.

### Approach 1: `514 test` CLI wrapper

Prefix any command with `514 test` to auto-resolve the current branch to a deployment and inject ClickHouse credentials:

```bash
# Run tests against current branch's preview deployment
514 test pnpm --filter e2e-tests test

# Run tests against a specific branch
514 test --branch main pnpm --filter e2e-tests test
```

Under the hood:
1. Detects 514 project link
2. Uses your authenticated 514 session to resolve branch → deployment → ClickHouse credentials
3. Injects `MOOSE_CLICKHOUSE_CONFIG__*` env vars into the child process
4. Runs your command

moose-lib is untouched — it just sees env vars. The OSS/commercial boundary is clean.

### Approach 2: `@514labs/vitest-plugin`

For projects that want auto-resolution embedded in the test lifecycle:

```typescript
// vitest.config.ts
import { fiveonefourPlugin } from "@514labs/vitest-plugin";

export default defineConfig({
  plugins: [fiveonefourPlugin()],
  test: {
    environment: "node",
  },
});
```

The plugin resolves credentials in `globalSetup` before any tests run. Same resolution logic as `514 test`, just triggered automatically. Override with `--branch`:

```bash
MOOSE_BRANCH=main pnpm --filter e2e-tests test
```

### Approach 3: Manual env vars (CI, custom setups)

Set `MOOSE_CLICKHOUSE_CONFIG__*` directly — standard for CI pipelines with injected secrets:

```bash
MOOSE_CLICKHOUSE_CONFIG__HOST=prod-host \
MOOSE_CLICKHOUSE_CONFIG__DB_NAME=514-demos-planes-main-59be4 \
MOOSE_CLICKHOUSE_CONFIG__USE_SSL=true \
pnpm --filter e2e-tests test
```

### Approach 4: Local dev (default)

```bash
pnpm --filter e2e-tests test
# Uses defaults from moose.config.toml: localhost:18123, database "local"
```

### Resolution order

When multiple sources are present, the resolution follows:

1. **Explicit `MOOSE_CLICKHOUSE_CONFIG__*` env vars** → use them (CI, manual override)
2. **`514 test` wrapper or vitest plugin** → resolve branch → deployment → credentials via 514 API
3. **`moose.config.toml`** → use local dev config (localhost fallback)

### Architectural boundary

`getMooseUtils()` lives in the open-source `@514labs/moose-lib` and only reads env vars and `moose.config.toml`. It has no knowledge of the 514 commercial platform. All 514-specific resolution lives in:

- `514 test` CLI command (part of the 514 CLI)
- `@514labs/vitest-plugin` (separate commercial package)

Both inject standard `MOOSE_CLICKHOUSE_CONFIG__*` env vars that moose-lib already reads.

## Multi-Candidate Comparison

To compare multiple optimization approaches:

1. Push each candidate as a branch → each gets a preview deployment
2. Run the same test file against each target (different env vars)
3. Compare the vitest output across runs

This can be done manually, scripted, or agent-orchestrated (agent spins up worktrees per candidate, runs tests in each, collects results).

## Companion Command: `514 table diff`

A standalone CLI command for comparing deployed table DDL between two branches. Useful independently for inspecting schema drift, and also useful for providing context alongside benchmark results.

```
514 table diff --table AircraftTrackingProcessedTable
```

Same branch inference as other 514 commands: compares current branch vs production. Overridable with `--baseline` and `--branch`.

### Output

```
Table: AircraftTrackingProcessedTable
Branches: main → perf/order-by-category

  ORDER BY:     (zorderCoordinate, hex) → (category, hex, timestamp)
  PRIMARY KEY:  (zorderCoordinate, hex) → (category, hex, timestamp)

  Changed columns:
    transponder_type:  String → LowCardinality(String)
    squawk:            String → LowCardinality(String)
    emergency:         String → LowCardinality(String)
    category:          String → LowCardinality(String)
    sil_type:          String → LowCardinality(String)

  Added columns: (none)
  Removed columns: (none)
  Engine: unchanged (SharedMergeTree)
```

Follows the existing CLI resource/action pattern: `514 table diff` alongside `514 table list`.

With `--json`, outputs structured diff for programmatic consumption.

### Implementation

1. Resolve both branches to deployments (same resolution used by `514 clickhouse query --branch`)
2. Run `SHOW CREATE TABLE` on both targets
3. Parse and diff the DDL: ORDER BY, PRIMARY KEY, column types, engine, settings
4. Format output

## Implementation Components

| Component | Where | Status | Boundary |
|-----------|-------|--------|----------|
| `QueryClient.explain(query)` | `@514labs/moose-lib` | New method — prototyped as helper | OSS |
| `QueryClient.benchmark(query, options)` | `@514labs/moose-lib` | New method — prototyped as helper | OSS |
| `QueryClient.estimate(query)` | `@514labs/moose-lib` | New method — designed | OSS |
| `QueryClient.profile(query)` | `@514labs/moose-lib` | New method — designed | OSS |
| `TableClient.storageStats(table)` | `@514labs/moose-lib` | New method — designed | OSS |
| `QueryClient.pipeline(query)` | `@514labs/moose-lib` | Future | OSS |
| `TableClient.mergeStatus(table)` | `@514labs/moose-lib` | Future | OSS |
| `getMooseUtils()` | `@514labs/moose-lib` | Exists — reads env vars + moose.config.toml | OSS |
| `toStaticQuery()` | `@514labs/moose-lib` | Exists — converts Sql to raw SQL strings | OSS |
| `514 test <command>` | `514` CLI | New command — resolves branch → env vars → runs command | Commercial |
| `@514labs/vitest-plugin` | Separate npm package | New — auto-resolves in vitest globalSetup | Commercial |
| `514 table diff` | `514` CLI | New command | Commercial |
| `514 clickhouse query --branch` | `514` CLI | Exists | Commercial |
| Test file | User's project | User-authored vitest tests | User code |

## Type Safety and Query Builder Pattern

`explain()` and `benchmark()` accept a `Sql` object — the same type returned by the `sql` template tag. This is enforced at the type level:

```typescript
// QueryClient method signatures:
explain(query: Sql): Promise<ExplainResult>
benchmark(query: Sql, options: { warmup: number; runs: number }): Promise<BenchmarkResult>
```

This means query builder functions must return a `Sql` object, not execute the query themselves. If a function executes the query and returns results (e.g., `Promise<any[]>`), it cannot be passed to `explain()` or `benchmark()` — TypeScript rejects it at compile time.

The `Sql` object becomes the common currency across three execution modes:

```typescript
const query = buildAircraftStatsQuery(sql, columns, { category: "A3" });

await client.query.execute(query);   // Production: run it
await client.query.explain(query);   // Analysis: explain it
await client.query.benchmark(query, { warmup: 2, runs: 5 }); // Benchmark: time it
```

This encourages a clean separation between **building queries** (returns `Sql`) and **executing queries** (calls a method on `client.query`). Functions that follow this pattern are automatically benchmarkable.

## What This Design Does NOT Include

- **No benchmark framework or `defineBenchmark()` config.** The test file IS the benchmark definition.
- **No `514 benchmark` CLI command.** The benchmark is a vitest test. You run it with `pnpm test`.
- **No report generator.** The vitest output is the report. For richer output, use vitest reporters or write results to a file from your test.
- **No multi-target comparison in a single run.** Run the same tests against different targets with different env vars. Compare the outputs.

## Dependencies on Other Work

| Dependency | Status | Ticket |
|------------|--------|--------|
| `514 agent deployment wait` (avoid polling for preview deploys) | Filed | ENG-2530 |
| `514 logs query` full body (debugging failures) | Filed | ENG-2528 |
| Deployment status accuracy (fail fast on migration errors) | Filed | ENG-2531 |

## End-to-End Flow: Perf Optimization Skill

This section describes how the `514--perf-optimize` skill should evolve to produce auditable, reproducible artifacts using the primitives above.

### What the skill produces today (opaque)

1. Agent runs ad-hoc `514 clickhouse query` calls for EXPLAIN and timing
2. Agent interprets results in its context window
3. Agent writes a PR description summarizing findings
4. Evidence is scattered across the conversation — not reproducible

### What the skill should produce (auditable)

The skill's primary artifact is a **benchmark test file** committed to the repo alongside the schema changes. The PR includes both the test and a human-readable summary.

### Skill flow

**Stage 1 — Profile.** Agent analyzes the current schema and query patterns. Uses `514 agent metrics query` to find slow queries, reads API source code to identify query builders. This stage is exploratory — no artifacts yet.

**Stage 2 — Write benchmark test.** Agent writes a vitest test file (e.g., `e2e-tests/tests/schema-benchmark.e2e.test.ts`) that:

- Imports the query builder functions from app code
- Calls `client.query.explain(query)` for each query variant
- Calls `client.query.benchmark(query, { warmup: 2, runs: 5 })` for timing
- Asserts on expected improvements (granule skip %, p95 thresholds)

This test captures what "good" looks like — it's the acceptance criteria for the optimization.

**Stage 3 — Run benchmark against production (baseline).** Agent runs:

```bash
514 test --branch main pnpm --filter e2e-tests test -- schema-benchmark
```

Captures the output. This is the "before" snapshot — EXPLAIN plans show full table scans, timing shows current latency.

**Stage 4 — Apply optimizations.** Agent modifies the Moose data model (ORDER BY, LowCardinality, etc.), validates locally with `moose dev`, commits, and pushes the branch.

**Stage 5 — Run benchmark against preview (candidate).** Agent waits for the preview deployment, then runs:

```bash
514 test --branch perf/optimize pnpm --filter e2e-tests test -- schema-benchmark
```

Captures the output. This is the "after" snapshot. If tests pass, the optimization works.

**Stage 6 — Create PR.** Agent creates a PR that includes:

1. **Schema changes** (the data model diffs — visible in the PR file changes)
2. **Benchmark test file** (committed to repo — anyone can re-run it)
3. **PR description** with a human-readable summary:

```markdown
## Summary

Optimized AircraftTrackingProcessedTable ORDER BY from (zorderCoordinate, hex)
to (category, hex, timestamp) to match API query patterns.

## Evidence

Benchmark test: `e2e-tests/tests/schema-benchmark.e2e.test.ts`

### Before (main)
- No filter: EXPLAIN shows Condition: true, 5921/5921 granules (full scan), p95 1894ms
- Category A3: EXPLAIN shows Condition: true, 5921/5921 granules, p95 1278ms

### After (perf/optimize)
- No filter: EXPLAIN shows Condition: category <> '', 19/24 granules (21% skip), p95 105ms
- Category A3: EXPLAIN shows Condition: category in ['A3'], 6/24 granules (75% skip), p95 124ms

### How to verify
Run the benchmark test against both branches:
    514 test --branch main pnpm --filter e2e-tests test -- schema-benchmark
    514 test --branch perf/optimize pnpm --filter e2e-tests test -- schema-benchmark

Schema diff:
    514 table diff --table AircraftTrackingProcessedTable
```

### What makes this auditable

| Question a reviewer asks | How they answer it |
|--------------------------|--------------------|
| What queries were tested? | Read the test file — it imports the actual query builders and lists the param variants |
| What were the EXPLAIN results? | Read the PR summary, or re-run the test against either branch |
| Can I reproduce this? | `514 test --branch <branch> pnpm test -- schema-benchmark` |
| What schema changes were made? | `514 table diff` or look at the data model diff in the PR |
| Are the timing numbers real? | Re-run the benchmark — same test, same queries, same targets |

### What the skill does NOT produce

- No opaque "benchmark report" generated by a framework
- No results that only exist in the agent's conversation transcript
- No CLI commands the user has to reconstruct from memory

Everything is either a committed test file, a CLI command listed in the PR, or a standard vitest output.
