-- Internal-only bootstrap for temporary benchmark users.
--
-- Usage:
--   514 clickhouse query --branch main --file sql/clickhouse/bootstrap-benchmark-reader-role.sql
--
-- This role is intentionally simple for the absolute MVP:
-- - read-only access
-- - broad SELECT scope on this ClickHouse service
-- - conservative execution settings to reduce blast radius
--
-- If profile()-style tests later require additional privileges
-- (for example SYSTEM FLUSH LOGS), add those deliberately in a follow-up
-- after validating the exact privilege syntax supported by the target
-- ClickHouse version.

CREATE ROLE IF NOT EXISTS benchmark_reader;

GRANT SELECT ON *.* TO benchmark_reader;

ALTER ROLE benchmark_reader
SETTINGS
    readonly = 1,
    max_execution_time = 60,
    max_threads = 4,
    max_memory_usage = 2000000000;
