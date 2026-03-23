# Temporary ClickHouse Users via `514 clickhouse query`

## Intent

This is the absolute minimal internal workaround for running benchmarks against a remote 514 target without copying ClickHouse credentials from the UI.

It is intentionally not the final public design.

The idea is:

1. use `514 clickhouse query` to run admin SQL against the target ClickHouse instance
2. create a short-lived benchmark user with a random password
3. grant that user a pre-created role
4. return the resulting `RuntimeClickHouseConfig` to the local test helper
5. initialize Moose directly from that config
6. drop the user after the benchmark run

This keeps the repo-side integration small while avoiding any persistent `.env` files.

## Hard Constraint

This only works if the ClickHouse principal behind `514 clickhouse query` has enough privilege to:

- `CREATE USER`
- `GRANT ROLE`
- `ALTER USER`
- `DROP USER`

If the public `514 clickhouse query` command does not already have those rights, do not widen its privilege boundary as a general user-facing feature. Treat this path as internal-only.

## Static SQL Asset

The committed bootstrap file is:

`sql/clickhouse/bootstrap-benchmark-reader-role.sql`

Run it once per target environment:

```bash
514 clickhouse query --branch main --file sql/clickhouse/bootstrap-benchmark-reader-role.sql
514 clickhouse query --file sql/clickhouse/bootstrap-benchmark-reader-role.sql
```

The file creates a reusable `benchmark_reader` role that gives temporary users a narrow, repeatable starting point.

## Runtime Flow

### 1. Resolve target

Resolve `local`, `current`, or `main` in the repo helper.

- `local` bypasses this entire path and uses normal Moose config
- `current` uses the current git branch via `514 clickhouse query`
- `main` explicitly passes `--branch main`

### 2. Generate temporary identity

In the repo helper, generate:

- random username, e.g. `tmp_bench_<timestamp>_<rand>`
- random password
- expiry timestamp, e.g. now + 30 minutes

### 3. Create the user

Build a dynamic SQL statement at runtime:

```sql
CREATE USER IF NOT EXISTS {username}
IDENTIFIED WITH sha256_password BY '{password}'
VALID UNTIL '{expires_at}';
```

### 4. Attach the role

Grant the bootstrap role and set it as default:

```sql
GRANT benchmark_reader TO {username};
ALTER USER {username} DEFAULT ROLE benchmark_reader;
```

### 5. Return Moose config

Return only:

```json
{
  "host": "...",
  "port": "8443",
  "username": "{username}",
  "password": "{password}",
  "database": "...",
  "useSSL": true
}
```

That object is then passed directly into `getMooseClients(config)`.

### 6. Run benchmark

Initialize Moose client from the returned config and run the existing tests.

### 7. Best-effort teardown

After the run, attempt:

```sql
DROP USER IF EXISTS {username};
```

`VALID UNTIL` remains the safety net if teardown does not run.

## Repo Helper Shape

```ts
type BenchmarkTarget = "local" | "current" | "main";

export async function issueTempClickHouseConfig(
  target: Exclude<BenchmarkTarget, "local">,
): Promise<RuntimeClickHouseConfig>;

export async function getTargetMooseClient(target: BenchmarkTarget) {
  if (target === "local") {
    return getMooseUtils();
  }

  const config = await issueTempClickHouseConfig(target);
  return getMooseClients(config);
}
```

`issueTempClickHouseConfig(target)` performs:

1. role bootstrap check or assumption that bootstrap already ran
2. dynamic `CREATE USER`
3. `GRANT benchmark_reader`
4. `ALTER USER ... DEFAULT ROLE`
5. return config

## How To Call `514 clickhouse query`

Preferred pattern for the helper:

- use `execa()` or equivalent without a shell
- pass SQL as a single argument or temporary in-memory file
- avoid echoing generated passwords into logs

Target examples:

```bash
514 clickhouse query --json "SELECT 1"
514 clickhouse query --branch main --json "SELECT 1"
```

Admin SQL examples follow the same target selection rule.

## Known Limitation

The current `benchmark_reader` role is intentionally minimal. It is designed for:

- read-only query execution
- correctness checks
- basic timing benchmarks
- `EXPLAIN`-style query inspection

It may not be sufficient for all advanced diagnostics in `helpers/clickhouse-diagnostics.ts`, especially flows that depend on elevated system operations. If that becomes necessary, add a second role or an explicit follow-up grant rather than widening the initial bootstrap file by default.

## Why This Is The Smallest Workable Hack

- one static SQL file
- one repo helper
- no UI copy/paste
- no persistent secret files
- no public new credential command required yet

It is still hacky because auth management is being driven through query execution, but it is the smallest path that preserves the existing Moose-based benchmark shape.
