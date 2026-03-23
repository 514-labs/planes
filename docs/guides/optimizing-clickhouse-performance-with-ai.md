# Optimizing ClickHouse Performance with AI

> Guide outline for [PMM-1074](https://linear.app/514/issue/PMM-1074/guide-optimizing-your-ch-performance-with-ai).
> Intended for the Moose documentation site under the Guides section.

---

## Guide Overview

**What the reader will accomplish**: Go from a slow ClickHouse query to an optimized schema with verified performance improvement, merged into production — using an AI agent to drive the entire optimization workflow.

**The developer's role**: Point the agent at your app. Review the PR. That's it. The agent reads your existing query code, profiles it, proposes schema changes, writes benchmark tests, runs them, and assembles the evidence.

**Prerequisites**:
- A MooseStack application deployed on Fiveonefour with ClickHouse
- The 514 CLI installed and authenticated (`514 auth login`)
- Claude Code with the `514--perf-optimize` skill
- Queries using moose-lib's `sql` template tag (this is how Moose queries work by default)

**Time to complete**: ~30 minutes

**What the developer does vs what the agent does**:

| Step | Who | What |
|------|-----|------|
| Have a deployed Moose app with queries | Developer | Already done — your existing `sql` tagged queries work |
| Profile and diagnose | Agent | Reads your query code, runs EXPLAIN, identifies ORDER BY mismatch |
| Propose schema changes | Agent | New ORDER BY, LowCardinality, etc. |
| Validate locally | Agent | `moose dev` to confirm DDL compiles |
| Write benchmark + correctness tests | Agent | vitest files importing your actual queries |
| Push and run against preview | Agent | Deploy, run tests, capture evidence |
| Review and merge | Developer | Read the PR, re-run tests if desired |

---

## Section 1: Understanding Why Your Query Is Slow

**Purpose**: The single most important insight before starting — ClickHouse performance is determined by the ORDER BY key. If it doesn't match the query pattern, ClickHouse scans every row.

**Content outline**:

### Your schema determines your query speed

- ClickHouse stores data sorted by the ORDER BY key. Queries that filter on ORDER BY columns skip large blocks of data (granules). Queries that don't — scan everything.
- The reader's likely situation: they built their schema based on their data model, not based on how they query it.

### Seeing the problem with EXPLAIN

- `EXPLAIN indexes = 1` as the diagnostic tool
- Full table scan: `Condition: true`, `selected_granules = total_granules`
- Granules in plain terms (blocks of ~8192 rows)

### Example: the planes app

- The running example: aircraft tracking data
- Original ORDER BY: `(zorderCoordinate, hex)` — designed for geographic queries
- API query: `GROUP BY category WHERE alt_baro > 0 AND gs > 0` — doesn't match
- EXPLAIN result: 5921/5921 granules, full scan, 0% skip
- "Category isn't in the ORDER BY, so ClickHouse can't skip anything"

---

## Section 2: How Your Queries Become Testable

**Purpose**: Explain how the agent finds and tests your queries — no special setup required. The same `sql` template tag you already use in your Moose app produces `Sql` objects that the benchmark helpers can analyze and time.

**Content outline**:

### It just works with your existing code

- Moose's `sql` template tag produces a `Sql` object
- The benchmark helpers (`explain`, `profileBenchmark`) accept `Sql` objects
- If your API handler has a query using `sql`, the agent can import it into a test and benchmark it directly
- No framework, no config, no special setup

### What the agent looks for in your app code

The agent scans your `app/` directory for queries hitting ClickHouse:
- API handlers using `sql` template tags
- Query builder functions that return `Sql` objects
- `defineQueryModel` configurations (if you use them)

Any function or expression that produces a `Sql` object is automatically benchmarkable.

### Example: a simple query in an API handler

```typescript
// app/apis/dashboard.ts — this is what you already have
app.get("/stats", async (req, res) => {
  const { client, sql } = await getMooseUtils();
  const result = await client.query.execute(sql`
    SELECT category, COUNT(*) as total, AVG(alt_baro) as avg_alt
    FROM ${MyTable}
    WHERE alt_baro > 0
    GROUP BY category
    ORDER BY total DESC
  `);
  res.json(await result.json());
});
```

The agent extracts that `sql` tagged query, imports it into a test, and runs `explain()` and `profileBenchmark()` on it. Your API code doesn't change.

### Example: the agent's benchmark test for that query

```typescript
// What the agent writes — tests/schema-benchmark.e2e.test.ts
import { getMooseUtils } from "@514labs/moose-lib";
import { explain, profileBenchmark } from "../helpers/clickhouse-diagnostics";

const { client, sql } = await getMooseUtils();
const query = sql`
  SELECT category, COUNT(*) as total, AVG(alt_baro) as avg_alt
  FROM ${MyTable}
  WHERE alt_baro > 0
  GROUP BY category
  ORDER BY total DESC
`;

it("uses primary key index", async () => {
  const plan = await explain(client.query, query);
  expect(plan.indexCondition).not.toBe("true");
});

it("server-side p95 under 500ms", async () => {
  const { p95 } = await profileBenchmark(client.query, query, 12);
  expect(p95).toBeLessThanOrEqual(500);
});
```

The query in the test is the same `Sql` object the app runs in production.

### Optional: defineQueryModel for structured queries

For complex queries with many filter combinations, `defineQueryModel` provides a structured way to declare dimensions, metrics, and filters. The agent can then use `buildQuery(model).filter(...)` to test different parameter combinations. This is entirely optional — the agent works just as well with raw `sql` template queries.

```typescript
// Optional: app/queries/aircraftStats.ts
import { defineQueryModel, count, avg } from "@514labs/moose-lib";

export const aircraftStatsModel = defineQueryModel({
  table: MyTable,
  dimensions: { category: { column: "category" } },
  metrics: { total: { agg: count() }, avgAlt: { agg: avg(MyTable.columns.alt_baro) } },
  filters: {
    category: { column: "category", operators: ["eq", "ne"] as const },
    altitude: { column: "alt_baro", operators: ["gt", "gte", "lte"] as const },
  },
  sortable: ["total"] as const,
});
```

When this exists, the agent uses it. When it doesn't, the agent works with whatever `sql` queries it finds in your handlers.

---

## Section 3: Run the Optimization

**Purpose**: The developer invokes the agent. The agent does everything from here — profiling, proposing changes, writing tests, validating, and creating the PR.

**Content outline**:

### Starting the optimization

- Ask the agent to optimize the query performance for your deployed application
- The agent uses the `514--perf-optimize` skill

### What the agent does (step by step)

**Step 1 — Profile production**:
- Reads your query model and API code
- Runs EXPLAIN against production via `514 clickhouse query --branch main`
- Identifies the mismatch: ORDER BY `(zorderCoordinate, hex)` vs query pattern `GROUP BY category`
- Checks slow queries via `514 agent metrics query`

**Step 2 — Propose schema changes**:
- Recommends new ORDER BY: `(category, hex, timestamp)` — puts the GROUP BY column first
- Recommends LowCardinality for repeated string columns
- Explains the expected impact: "category filter should skip ~75% of granules"

**Step 3 — Validate locally**:
- Modifies the data model (`ingest_v1.ts`)
- Runs `moose dev` to confirm the DDL compiles and tables can be created
- Catches errors like PRIMARY KEY / ORDER BY mismatch before pushing

**Step 4 — Write benchmark and correctness tests**:
- Creates `moose-performance.e2e.test.ts` that imports the queries from your app code
- Uses the same `sql` tagged queries your API handlers use — or `buildQuery(model)` if you have a `defineQueryModel`
- Asserts on:
  - EXPLAIN: `plan.indexCondition !== "true"` (primary key is used)
  - EXPLAIN: `plan.granuleSkipPct > 50` (skipping meaningful data)
  - Server-side timing: `p95 < 500ms` (from `system.query_log`, not client-side)
  - Filter regression: filtered queries don't regress vs baseline
  - Concurrent load: 10 simultaneous queries, 0% error rate
- Creates `moose-correctness.e2e.test.ts` with snapshot validation
- The tests are committed to your repo — anyone can re-run them

**Step 5 — Push and deploy preview**:
- Commits schema changes + test files
- Pushes the branch → preview deployment created with isolated ClickHouse database
- Waits for deployment to complete

**Step 6 — Run tests against preview**:
- Points the tests at the preview deployment
- Runs performance tests → captures EXPLAIN plans, server-side timing, cluster diagnostics
- Runs correctness tests → verifies query results match
- Saves detailed results to `benchmark-details-{timestamp}.json`

**Step 7 — Create PR with evidence**:
- PR includes:
  - Schema changes (data model diffs)
  - Benchmark test file (committed — anyone can re-run)
  - Summary with before/after EXPLAIN comparison, timing data, reproduction commands

### What the developer sees

- A PR with a clear summary: "ORDER BY changed, 75% granule skip, p95 went from 200ms to 30ms"
- A test file they can read to understand exactly what was tested
- Commands they can run to verify the results themselves

---

## Section 4: Review and Verify

**Purpose**: The developer reviews the agent's work. The evidence is code they own, not a summary they have to trust.

**Content outline**:

### Reading the PR

- Schema changes: see the ORDER BY, LowCardinality, primaryKeyExpression modifications
- Test file: see exactly which queries were tested and what the assertions are
- Evidence summary: before/after EXPLAIN comparison, timing data

### Re-running the tests yourself (optional)

```bash
# Against the preview deployment
cd e2e-tests
env $(cat .env.local.preview | xargs) npx vitest run tests/moose-performance.e2e.test.ts

# Against production (baseline comparison)
env $(cat .env.local.production | xargs) npx vitest run tests/moose-performance.e2e.test.ts
```

### Auditing the detail report

- Open `reports/benchmark-details-{timestamp}.json`
- Every test records: exact SQL executed, every timing sample, full EXPLAIN plan, target metadata
- The `queryId` field links each measurement to a specific `system.query_log` entry

### What to look for

| Question | Where to find the answer |
|----------|-------------------------|
| Did the primary key get used? | EXPLAIN test: `indexCondition` should not be `"true"` |
| How much data is being skipped? | EXPLAIN test: `granuleSkipPct` should be > 0 |
| How fast is the query server-side? | Profile data: `durationMs` in the benchmark details JSON |
| Did the optimization break anything? | Correctness test: snapshot hash should match |
| Can I reproduce this? | Run the test command from the PR description |

### Merge

- If tests pass and the evidence looks right, merge the PR
- The benchmark test stays in the repo as a permanent regression guard
- If a future change degrades performance, this test fails before it reaches production

---

## Section 5: Reference

**Purpose**: Quick reference for tools, env vars, and file structure.

### How tests target different deployments

Same test file, different target — controlled by environment variables:

```bash
# Local dev (default)
npx vitest run tests/moose-performance.e2e.test.ts

# Preview deployment
env $(cat .env.local.preview | xargs) npx vitest run tests/moose-performance.e2e.test.ts

# Production
env $(cat .env.local.production | xargs) npx vitest run tests/moose-performance.e2e.test.ts
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MOOSE_CLICKHOUSE_CONFIG__HOST` | localhost | ClickHouse host |
| `MOOSE_CLICKHOUSE_CONFIG__HOST_PORT` | 18123 | ClickHouse HTTP port |
| `MOOSE_CLICKHOUSE_CONFIG__USER` | — | ClickHouse username |
| `MOOSE_CLICKHOUSE_CONFIG__PASSWORD` | — | ClickHouse password |
| `MOOSE_CLICKHOUSE_CONFIG__DB_NAME` | local | ClickHouse database |
| `MOOSE_CLICKHOUSE_CONFIG__USE_SSL` | false | Use HTTPS |

### Diagnostic helpers

| Function | What it does |
|----------|-------------|
| `explain(client, query)` | EXPLAIN indexes=1 → index condition, granule skip % |
| `profileBenchmark(client, query, runs)` | N runs with batch system.query_log resolution → p50/p95 server-side |
| `clusterDiagnostics(client)` | Active merges, part counts per table |
| `tableStats(client, table)` | Row count, part count, disk size |
| `saveSnapshot` / `compareSnapshot` | Correctness validation via result set hashing |

### File structure

```
e2e-tests/
├── helpers/                        # Reusable (no app-specific code)
│   ├── clickhouse-diagnostics.ts   # explain, profileBenchmark, clusterDiagnostics, tableStats
│   ├── test-reporter.ts            # JSON report accumulator
│   ├── snapshot.ts                 # save/compare result snapshots
│   └── connection-timing.ts        # HTTP connection-level diagnostics
├── tests/                          # App-specific
│   ├── standard-queries.ts         # standardQuery() using your defineQueryModel
│   ├── moose-performance.e2e.test.ts
│   ├── moose-correctness.e2e.test.ts
│   └── moose-api.e2e.test.ts
├── snapshots/                      # Committed known-good query results
├── reports/                        # Generated per-run (gitignored)
└── .env.local.preview              # Preview credentials (gitignored)
moose/app/
└── queries/
    └── aircraftStats.ts            # defineQueryModel — single source of truth
```
