import { Api, getMooseUtils, WebApp, sql } from "@514labs/moose-lib";
import { AircraftTrackingProcessed_Table } from "../index";
import { AircraftStatsByCategory_Table } from "../ingest/aircraft_stats_mv";
import express, { Request } from "express";
import cors from "cors";

interface AircraftSpeedAltitudeParams {
  category?: string;
  minAltitude?: number;
  maxAltitude?: number;
  minSpeed?: number;
  maxSpeed?: number;
}

function hasActiveFilters(params: AircraftSpeedAltitudeParams): boolean {
  return !!(
    params.category ||
    params.minAltitude ||
    params.maxAltitude ||
    params.minSpeed ||
    params.maxSpeed
  );
}

/**
 * Fast path: reads ~10 rows from the AggregatingMergeTree target table
 * populated by the MaterializedView. Used when no range filters are active.
 */
const buildMVQuery = (
  mvCols: typeof AircraftStatsByCategory_Table.columns,
  params: AircraftSpeedAltitudeParams,
) => {
  const categoryFilter =
    params.category
      ? sql`WHERE ${mvCols.category} = ${params.category}`
      : sql``;

  return sql`
    SELECT
      ${mvCols.category}                    AS aircraft_category,
      sum(${mvCols.total_records})          AS total_records,
      avgMerge(${mvCols.avg_alt_baro})      AS avg_barometric_altitude,
      min(${mvCols.min_alt_baro})           AS min_barometric_altitude,
      max(${mvCols.max_alt_baro})           AS max_barometric_altitude,
      stddevPopMerge(${mvCols.stddev_alt_baro}) AS altitude_stddev,
      avgMerge(${mvCols.avg_gs})            AS avg_ground_speed,
      min(${mvCols.min_gs})                 AS min_ground_speed,
      max(${mvCols.max_gs})                 AS max_ground_speed,
      stddevPopMerge(${mvCols.stddev_gs})   AS speed_stddev,
      uniqMerge(${mvCols.unique_aircraft})  AS unique_aircraft_count
    FROM ${AircraftStatsByCategory_Table}
    ${categoryFilter}
    GROUP BY ${mvCols.category}
    ORDER BY total_records DESC
  `;
};

/**
 * Slow path: full table scan on the raw table.
 * Only used when altitude/speed range filters are active.
 */
const buildFullScanQuery = (
  sqlTag: any,
  cols: any,
  params: AircraftSpeedAltitudeParams,
) => {
  return sqlTag`
    SELECT
      ${cols.category} as aircraft_category,
      COUNT(*) as total_records,
      AVG(${cols.alt_baro}) as avg_barometric_altitude,
      MIN(${cols.alt_baro}) as min_barometric_altitude,
      MAX(${cols.alt_baro}) as max_barometric_altitude,
      STDDEV_POP(${cols.alt_baro}) as altitude_stddev,
      AVG(${cols.gs}) as avg_ground_speed,
      MIN(${cols.gs}) as min_ground_speed,
      MAX(${cols.gs}) as max_ground_speed,
      STDDEV_POP(${cols.gs}) as speed_stddev,
      COUNT(DISTINCT ${cols.hex}) as unique_aircraft_count
    FROM ${AircraftTrackingProcessed_Table}
    WHERE ${cols.alt_baro} > 0
      AND ${cols.gs} > 0
      AND ${cols.category} != ''
      AND (${params.category || ''} = '' OR ${cols.category} = ${params.category || ''})
      AND (${params.minAltitude || -999999} = -999999 OR ${cols.alt_baro} >= ${params.minAltitude || -999999})
      AND (${params.maxAltitude || 999999} = 999999 OR ${cols.alt_baro} <= ${params.maxAltitude || 999999})
      AND (${params.minSpeed || -999999} = -999999 OR ${cols.gs} >= ${params.minSpeed || -999999})
      AND (${params.maxSpeed || 999999} = 999999 OR ${cols.gs} <= ${params.maxSpeed || 999999})
    GROUP BY ${cols.category}
    ORDER BY total_records DESC
  `;
};

const app = express();
app.use(cors());
app.use(express.json());

app.get("/aircraftSpeedAltitudeByType", async (req: Request<{}, {}, {}, AircraftSpeedAltitudeParams>, res) => {
  const moose = await getMooseUtils();
  const params = req.query;

  const query = hasActiveFilters(params)
    ? buildFullScanQuery(
        moose.sql,
        AircraftTrackingProcessed_Table?.columns,
        params,
      )
    : buildMVQuery(AircraftStatsByCategory_Table?.columns, params);

  const result = await moose.client.query.execute(query);
  const data = await result.json();
  res.json(data);
});

new WebApp("aircraft", app, {
  mountPath: "/aircraft/api",
  metadata: {
    description:
      "API for consuming aircraft data",
  },
});

/**
 * Moose Consumption Api
 * API that provides speed and altitude statistics for different aircraft types/categories
 * Uses barometric altitude (NOT geometric altitude) and ground speed

export const aircraftSpeedAltitudeByType = new Api<AircraftSpeedAltitudeParams>(
  "aircraftSpeedAltitudeByType",
  async (params, { client, sql }) => {
    // Reference the source table object inside the function
    const aircraft_cols = AircraftTrackingProcessed_Table?.columns;

    // Execute the query with robust optional parameter handling
    const query = buildAircraftStatsQuery(sql, aircraft_cols, params);
    const result = await client.query.execute(query);

    return result;
  },
  {
    metadata: {
      description: "Provides speed and altitude statistics for different aircraft types/categories",
    },
  }
);
 */
