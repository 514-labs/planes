# 514 ClickHouse Credentials MVP

## Problem

Running the existing e2e performance and correctness tests against a 514-hosted target is too manual. The current workflow requires opening the 514 hosting UI, copying ClickHouse connection details, pasting them into a local `.env` file, and then pointing the tests at that file. This is slow, error-prone, and awkward for repeated runs against `current` and `main`.

The goal of this MVP is narrow: remove the UI copy/paste step for ClickHouse credentials while keeping the existing test setup essentially unchanged.

## Goals

- Fetch ClickHouse credentials for a remote 514 target at runtime using the user's existing 514 authentication.
- Keep the returned data focused only on ClickHouse connection config.
- Keep the current Moose client and Vitest-based test setup intact after initialization.
- Avoid writing secrets to disk.
- Keep the contract small enough that it can be implemented without introducing a new general-purpose SDK or workflow layer.

## Non-Goals

- No new benchmark-specific API.
- No target metadata in the credentials response.
- No `.env` generation or persistent credential caching.
- No new general `514 target run` or shell wrapper in MVP.
- No arbitrary deployment selection in MVP.

## Command Brief

- Command name: `514 clickhouse credentials`
- Primary user: developer running local tests against a 514-hosted ClickHouse target
- Primary job-to-be-done: retrieve runtime ClickHouse config for a known target
- Inputs: `--target <current|main>`, `--json`
- Side effects: network call to 514 control plane
- Success criteria: prints a valid `RuntimeClickHouseConfig` JSON object to `stdout`
- Failure criteria: prints actionable error text to `stderr` and exits non-zero

## CLI Contract

### Usage

```bash
514 clickhouse credentials --target current --json
514 clickhouse credentials --target main --json
```

### Inputs

- `--target <current|main>`: required
- `--json`: required in MVP

`local` is intentionally not supported by this command. Local execution is already handled by Moose config resolution and should stay outside the 514 credentials path.

### stdout Contract

`stdout` must contain only JSON in this exact shape:

```json
{
  "host": "yey99hpcxa.clickhouse.boreal.cloud",
  "port": "8443",
  "username": "svc_preview_reader",
  "password": "secret",
  "database": "514-demos-planes-perf-index-tuning",
  "useSSL": true
}
```

This shape intentionally matches `RuntimeClickHouseConfig` from `@514labs/moose-lib` so the caller can pass it through directly without reshaping.

### stderr Contract

`stderr` may contain:

- auth failures
- target resolution failures
- permission failures
- transient service failures

It must not contain secrets.

### Exit Codes

- `0`: credentials returned successfully
- non-zero: command failed and no usable JSON was printed

## Resolution Rules

The command resolves only the ClickHouse config for the named target.

- `current`: resolve the current branch in the linked repo, then fetch the ClickHouse config for that target
- `main`: resolve the current `main` target, then fetch the ClickHouse config for that target

This command should not return deployment URL, branch name, benchmark settings, or any other metadata. If target introspection is needed later, that should be added as a separate command, not folded into the credentials payload.

## Security Model

This MVP improves developer workflow first and security second.

- Credentials are fetched at runtime using the current 514 auth session.
- Credentials are not copied from the UI.
- Credentials are not written to disk by default.
- Credentials may exist briefly in process memory and CLI stdout when `--json` is used.

This is acceptable for MVP because the command is intentionally narrow and local-helper driven. A later version can switch the backend to temporary issued credentials without changing the response shape or the repo-side helper.

## Repo Integration

The current tests initialize Moose directly with `await getMooseUtils()`. For remote targets, the repo should introduce one small helper that either:

- uses the existing local Moose config for `local`, or
- fetches remote ClickHouse credentials from 514 and passes them into Moose client creation

Recommended helper contract:

```ts
type BenchmarkTarget = "local" | "current" | "main";

export async function getTargetMooseClient(target: BenchmarkTarget) {
  if (target === "local") {
    return getMooseUtils();
  }

  const config = await get514ClickHouseCredentials(target);
  return getMooseClients(config);
}
```

In MVP, `get514ClickHouseCredentials(target)` can shell out to:

```bash
514 clickhouse credentials --target <target> --json
```

and parse the returned JSON.

## Why `getMooseClients(config)` Is The Right Seam

The helper should pass the fetched config directly into Moose client initialization rather than mutating global environment variables first.

Reason:

- the current tests use top-level client initialization
- env mutation introduces ordering and caching risk
- `getMooseClients(config)` already accepts the exact `RuntimeClickHouseConfig` shape

This keeps the integration additive and localized. The helper owns the remote resolution step; the rest of the tests keep using the returned `client` the same way they do now.

## Expected Test Changes

Current shape:

```ts
const { client } = await getMooseUtils();
```

MVP shape:

```ts
const target = resolveBenchmarkTarget();
const { client } = await getTargetMooseClient(target);
```

Recommended target selection for the repo:

- `MOOSE_BENCHMARK_TARGET=local|current|main`
- default to `local` when unset

This keeps the runtime contract explicit without introducing a new test runner.

## Reporter Adjustment

`createTestReporter()` currently reads host and database from environment variables. That works for `.env`-based flows but is no longer reliable once remote config is passed directly into Moose client creation.

The reporter should instead accept explicit target info:

```ts
createTestReporter("benchmark-details", {
  host: "...",
  database: "...",
});
```

That keeps reporting accurate for both local and remote targets without depending on process-level env state.

## Help Output

```text
$ 514 clickhouse credentials --help
Get ClickHouse connection credentials for a 514 target.

Usage:
  514 clickhouse credentials --target <current|main> --json

Options:
  --target <target>  Target to resolve (`current`, `main`)
  --json             Print RuntimeClickHouseConfig JSON to stdout
  -h, --help         Show help

Examples:
  514 clickhouse credentials --target current --json
  514 clickhouse credentials --target main --json
```

## Output-State Matrix

| State | Trigger | Stream | User Message Goal | Machine-Safe? | Next Action |
|---|---|---|---|---|---|
| Help | `--help` | stdout | Explain purpose and flags | Yes | Run command |
| Success | valid auth + target resolved | stdout | Return config object only | Yes | Parse JSON |
| Progress | network/auth resolution | stderr | Show lightweight status if needed | N/A | Wait |
| Recoverable Error | missing auth | stderr | Explain fix clearly | N/A | `514 auth login` |
| Recoverable Error | target not found | stderr | Explain what target could not be resolved | N/A | retry with valid target |
| Fatal Error | internal/service failure | stderr | Explain failure and exit non-zero | N/A | retry later |

## Example Transcripts

### Success

```text
$ 514 clickhouse credentials --target current --json
{"host":"yey99hpcxa.clickhouse.boreal.cloud","port":"8443","username":"svc_preview_reader","password":"secret","database":"514-demos-planes-perf-index-tuning","useSSL":true}
```

### Missing Auth

```text
$ 514 clickhouse credentials --target current --json
Error: You are not signed in to 514.
Fix: 514 auth login
```

### Target Not Found

```text
$ 514 clickhouse credentials --target current --json
Error: Could not resolve ClickHouse credentials for target `current`.
Fix: Ensure the current branch has an active 514 target or retry with `--target main`.
```

## Future-Compatible Evolution

This MVP is intentionally small, but the contract is forward-compatible.

Later improvements can include:

- switching backend credentials from static deployment creds to temporary issued creds
- adding a higher-level `514 target run` wrapper
- adding a separate target-inspection command for branch/deployment metadata

None of those require changing the JSON returned by `514 clickhouse credentials` as long as it continues to return a valid `RuntimeClickHouseConfig`.
