import { buildQuery } from "@514labs/moose-lib";
import { defineBenchmark } from "./benchmark/core";
import { aircraftStatsModel } from "../dist/index";

const benchmarkModel = aircraftStatsModel;

const baseQuery = () =>
  buildQuery(benchmarkModel)
    .dimensions(
      Object.keys(
        benchmarkModel.dimensions!,
      ) as (keyof typeof benchmarkModel.dimensions)[],
    )
    .metrics(
      Object.keys(
        benchmarkModel.metrics!,
      ) as (keyof typeof benchmarkModel.metrics)[],
    );

export const benchmark = defineBenchmark({
  baseQuery,
  scenarios: [
    {
      name: "category=A3",
      query: () => baseQuery().filter("category", "eq", "A3"),
    },
    {
      name: "altitude>10000",
      query: () => baseQuery().filter("altitude", "gt", 10000),
    },
    {
      name: "speed>300",
      query: () => baseQuery().filter("speed", "gt", 300),
    },
  ],
  thresholds: {
    baselineP95Ms: 500,
    scenarioRegressionRatio: 2.5,
  },
  sampling: {
    baselineRuns: 12,
    scenarioRuns: 6,
  },
});
