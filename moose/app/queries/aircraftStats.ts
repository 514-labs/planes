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

const T = AircraftTrackingProcessed_Table;

export const aircraftStatsModel = defineQueryModel({
  name: "aircraft_speed_altitude_by_type",
  description: "Speed and altitude statistics by aircraft category",
  table: T,
  dimensions: {
    aircraftCategory: { column: "category", as: "aircraft_category" },
  },
  metrics: {
    totalRecords: { agg: count(), as: "total_records" },
    uniqueAircraftCount: { agg: countDistinct(T.columns.hex), as: "unique_aircraft_count" },
    avgBarometricAltitude: { agg: avg(T.columns.alt_baro), as: "avg_barometric_altitude" },
    minBarometricAltitude: { agg: min(T.columns.alt_baro), as: "min_barometric_altitude" },
    maxBarometricAltitude: { agg: max(T.columns.alt_baro), as: "max_barometric_altitude" },
    altitudeStddev: { agg: sql`STDDEV_POP(${T.columns.alt_baro})`, as: "altitude_stddev" },
    avgGroundSpeed: { agg: avg(T.columns.gs), as: "avg_ground_speed" },
    minGroundSpeed: { agg: min(T.columns.gs), as: "min_ground_speed" },
    maxGroundSpeed: { agg: max(T.columns.gs), as: "max_ground_speed" },
    speedStddev: { agg: sql`STDDEV_POP(${T.columns.gs})`, as: "speed_stddev" },
  },
  filters: {
    category: { column: "category", operators: ["eq", "ne"] as const },
    altitude: { column: "alt_baro", operators: ["gt", "gte", "lte"] as const },
    speed: { column: "gs", operators: ["gt", "gte", "lte"] as const },
    timestamp: { column: "timestamp", operators: ["gt", "gte", "lt", "lte"] as const },
  },
  sortable: ["totalRecords", "avgBarometricAltitude", "avgGroundSpeed"] as const,
  defaults: {
    dimensions: ["aircraftCategory"],
    orderBy: [["totalRecords", "DESC"]],
    maxLimit: 10000,
    limit: 10000,
  },
});
