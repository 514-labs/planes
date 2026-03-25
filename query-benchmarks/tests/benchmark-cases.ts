/**
 * Benchmark Cases
 *
 * Define the query variants to benchmark. Each case builds a query
 * from the model with specific filter combinations.
 *
 * The baseline case (no extra filters) is always included.
 * Add filter variants to test how filtered queries perform
 * relative to the baseline.
 */

import { buildQuery } from "@514labs/moose-lib";
import { benchmarkModel } from "./benchmark-model";

const model = benchmarkModel;

const ALL_METRICS = Object.keys(
  model.metrics!,
) as (keyof typeof model.metrics)[];

const ALL_DIMENSIONS = Object.keys(
  model.dimensions!,
) as (keyof typeof model.dimensions)[];

/**
 * Base query with all dimensions, metrics, and required filters.
 * Every benchmark case starts from this.
 */
export function baseQuery() {
  return buildQuery(model)
    .dimensions(ALL_DIMENSIONS)
    .metrics(ALL_METRICS);
}

/**
 * Filter variants to test against the baseline.
 *
 * TODO: Add filter combinations relevant to your query patterns.
 *
 * Example:
 *   { name: "category=A3", build: () => baseQuery().filter("category", "eq", "A3") },
 *   { name: "date range", build: () => baseQuery().filter("date", "gte", "2026-01-01").filter("date", "lte", "2026-03-01") },
 */
export const filterVariants: Array<{
  name: string;
  build: () => ReturnType<typeof baseQuery>;
}> = [
  { name: "category=A3", build: () => baseQuery().filter("category", "eq", "A3") },
  { name: "altitude range", build: () => baseQuery().filter("altitude", "gte", 10000).filter("altitude", "lte", 30000) },
  { name: "speed range", build: () => baseQuery().filter("speed", "gte", 200).filter("speed", "lte", 500) },
  {
    name: "combined",
    build: () =>
      baseQuery()
        .filter("category", "eq", "A3")
        .filter("altitude", "gte", 10000)
        .filter("altitude", "lte", 30000)
        .filter("speed", "gte", 200)
        .filter("speed", "lte", 500),
  },
];
