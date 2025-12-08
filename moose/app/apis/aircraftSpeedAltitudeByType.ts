import { Api, expressMiddleware, getMooseUtils, WebApp } from "@514labs/moose-lib";
import { AircraftTrackingProcessed_Table } from "../index";
import express, { Request } from "express";
import cors from "cors";
import { AircraftTrackingProcessed } from "datamodels/models";

/**
 * Parameters for the aircraft speed and altitude by type API
 */
interface AircraftSpeedAltitudeParams {
  /** Optional filter for specific aircraft category */
  category?: string;
  /** Optional minimum barometric altitude filter */
  minAltitude?: number;
  /** Optional maximum barometric altitude filter */
  maxAltitude?: number;
  /** Optional minimum ground speed filter */
  minSpeed?: number;
  /** Optional maximum ground speed filter */
  maxSpeed?: number;
}

/**
 * Constructs the SQL query for aircraft speed and altitude statistics
 */
const buildAircraftStatsQuery = (sql: any, aircraft_cols: typeof AircraftTrackingProcessed_Table.columns, params: AircraftSpeedAltitudeParams) => {
  return sql`
    SELECT
      ${aircraft_cols.category} as aircraft_category,
      COUNT(*) as total_records,
      AVG(${aircraft_cols.alt_baro}) as avg_barometric_altitude,
      MIN(${aircraft_cols.alt_baro}) as min_barometric_altitude,
      MAX(${aircraft_cols.alt_baro}) as max_barometric_altitude,
      STDDEV_POP(${aircraft_cols.alt_baro}) as altitude_stddev,
      AVG(${aircraft_cols.gs}) as avg_ground_speed,
      MIN(${aircraft_cols.gs}) as min_ground_speed,
      MAX(${aircraft_cols.gs}) as max_ground_speed,
      STDDEV_POP(${aircraft_cols.gs}) as speed_stddev,
      COUNT(DISTINCT ${aircraft_cols.hex}) as unique_aircraft_count
    FROM ${AircraftTrackingProcessed_Table}
    WHERE ${aircraft_cols.alt_baro} > 0
      AND ${aircraft_cols.gs} > 0
      AND ${aircraft_cols.category} != ''
      -- Optional category filter
      AND (${params.category || ''} = '' OR ${aircraft_cols.category} = ${params.category || ''})
      -- Optional altitude range filters
      AND (${params.minAltitude || -999999} = -999999 OR ${aircraft_cols.alt_baro} >= ${params.minAltitude || -999999})
      AND (${params.maxAltitude || 999999} = 999999 OR ${aircraft_cols.alt_baro} <= ${params.maxAltitude || 999999})
      -- Optional speed range filters
      AND (${params.minSpeed || -999999} = -999999 OR ${aircraft_cols.gs} >= ${params.minSpeed || -999999})
      AND (${params.maxSpeed || 999999} = 999999 OR ${aircraft_cols.gs} <= ${params.maxSpeed || 999999})
    GROUP BY ${aircraft_cols.category}
    ORDER BY total_records DESC
  `;
};


const app = express();
app.use(cors());
app.use(express.json());
app.use(expressMiddleware());

/**
 * Express API Handler
 * API that provides speed and altitude statistics for different aircraft types/categories
 * Uses barometric altitude (NOT geometric altitude) and ground speed
 */
app.get("/aircraftSpeedAltitudeByType", async (req: Request<{}, {}, {}, AircraftSpeedAltitudeParams>, res) => {
  const moose = getMooseUtils(req);
  if (!moose) {
    console.error("MooseStack utilities not available");
    return res
      .status(500)
      .json({ error: "MooseStack utilities not available" });
  }

  const { client, sql } = moose;

  // Reference the source table object inside the function
  const aircraft_cols = AircraftTrackingProcessed_Table?.columns;
  const params = req.query;

  // Execute the query with robust optional parameter handling
  const query = buildAircraftStatsQuery(sql, aircraft_cols, params);
  const result = await client.query.execute(query);

  const data = await result.json();
  res.json(data);
});

/**
 * Express API Handler
 * API that returns the average speed across all aircraft
 * Uses ground speed (gs) field from AircraftTrackingProcessedTable
 * No filters applied - calculates average across all records
 */
app.get("/averageSpeed", async (req: Request, res) => {
  const moose = getMooseUtils(req);
  if (!moose) {
    console.error("MooseStack utilities not available");
    return res
      .status(500)
      .json({ error: "MooseStack utilities not available" });
  }

  const { client, sql } = moose;

  // Reference the source table object
  const aircraft_cols = AircraftTrackingProcessed_Table?.columns;

  // Build query to calculate average speed across all aircraft
  // No filters applied as requested
  const query = sql`
    SELECT
      AVG(${aircraft_cols.gs}) as average_speed,
      COUNT(*) as total_records,
      MIN(${aircraft_cols.gs}) as min_speed,
      MAX(${aircraft_cols.gs}) as max_speed
    FROM ${AircraftTrackingProcessed_Table}
  `;

  try {
    const result = await client.query.execute(query);
    const data = await result.json();
    res.json(data);
  } catch (error) {
    console.error("Error executing average speed query:", error);
    res.status(500).json({ error: "Failed to calculate average speed" });
  }
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
