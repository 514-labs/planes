/**
 * Shared query builders for the aircraft stats model.
 * These construct the same queries the API runs in production.
 */

import { buildQuery } from "@514labs/moose-lib";
import { aircraftStatsModel } from "planes-moose";

const ALL_METRICS = Object.keys(
  aircraftStatsModel.metrics!,
) as (keyof typeof aircraftStatsModel.metrics)[];

const ALL_DIMENSIONS = Object.keys(
  aircraftStatsModel.dimensions!,
) as (keyof typeof aircraftStatsModel.dimensions)[];

/**
 * Standard query with all dimensions, metrics, and base filters applied.
 * Chain additional filters on top for specific test scenarios.
 */
export function standardQuery() {
  return buildQuery(aircraftStatsModel)
    .dimensions(ALL_DIMENSIONS)
    .metrics(ALL_METRICS)
    .filter("altitude", "gt", 0)
    .filter("speed", "gt", 0)
    .filter("category", "ne", "");
}
