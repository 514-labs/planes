import {
  defineQueryModel,
  count,
  countDistinct,
  avg,
  min,
  max,
  sql,
} from "@514labs/moose-lib";
import { AircraftTrackingProcessed_Table } from "../ingest/ingest";
import { AircraftTrackingProcessed_Table_v1 } from "../ingest/ingest_v1";

const T = AircraftTrackingProcessed_Table;
const T1 = AircraftTrackingProcessed_Table_v1;

function buildModelConfig(table: typeof T) {
  return {
    description: "Speed and altitude statistics by aircraft category",
    table,
    dimensions: {
      aircraftCategory: { column: "category" as const, as: "aircraft_category" },
    },
    metrics: {
      totalRecords: { agg: count(), as: "total_records" },
      uniqueAircraftCount: { agg: countDistinct(table.columns.hex), as: "unique_aircraft_count" },
      avgBarometricAltitude: { agg: avg(table.columns.alt_baro), as: "avg_barometric_altitude" },
      minBarometricAltitude: { agg: min(table.columns.alt_baro), as: "min_barometric_altitude" },
      maxBarometricAltitude: { agg: max(table.columns.alt_baro), as: "max_barometric_altitude" },
      altitudeStddev: { agg: sql`STDDEV_POP(${table.columns.alt_baro})`, as: "altitude_stddev" },
      avgGroundSpeed: { agg: avg(table.columns.gs), as: "avg_ground_speed" },
      minGroundSpeed: { agg: min(table.columns.gs), as: "min_ground_speed" },
      maxGroundSpeed: { agg: max(table.columns.gs), as: "max_ground_speed" },
      speedStddev: { agg: sql`STDDEV_POP(${table.columns.gs})`, as: "speed_stddev" },
    },
    filters: {
      category: { column: "category" as const, operators: ["eq", "ne"] as const },
      altitude: { column: "alt_baro" as const, operators: ["gt", "gte", "lte"] as const },
      speed: { column: "gs" as const, operators: ["gt", "gte", "lte"] as const },
      timestamp: { column: "timestamp" as const, operators: ["gt", "gte", "lt", "lte"] as const },
    },
    sortable: ["totalRecords", "avgBarometricAltitude", "avgGroundSpeed"] as const,
    defaults: {
      dimensions: ["aircraftCategory"] as string[],
      orderBy: [["totalRecords", "DESC"]] as [string, "DESC"][],
      maxLimit: 10000,
      limit: 10000,
    },
  };
}

/** Original table: ORDER BY (zorderCoordinate, hex) */
export const aircraftStatsModel = defineQueryModel({
  name: "aircraft_speed_altitude_by_type",
  ...buildModelConfig(T),
});

/** Optimized table: ORDER BY (category, hex, timestamp) */
export const aircraftStatsModelV1 = defineQueryModel({
  name: "aircraft_speed_altitude_by_type_v1",
  ...buildModelConfig(T1),
});
