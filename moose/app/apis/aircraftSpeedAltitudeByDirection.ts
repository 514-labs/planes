import { Api } from "@514labs/moose-lib";
import { AircraftTrackingProcessed_Table } from "../index";
import { tags } from "typia";

/**
 * Parameters for the aircraft speed and altitude by direction API
 */
interface AircraftSpeedAltitudeByDirectionParams {
  /** Optional filter for specific direction (N, NE, E, SE, S, SW, W, NW) */
  direction?: string;
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
 * API that provides speed and altitude statistics for different aircraft directions
 * Groups aircraft by compass direction (N, NE, E, SE, S, SW, W, NW)
 * Uses barometric altitude (NOT geometric altitude) and ground speed
 */
export const aircraftSpeedAltitudeByDirection = new Api<AircraftSpeedAltitudeByDirectionParams>(
  "aircraftSpeedAltitudeByDirection",
  async (params, { client, sql }) => {
    // Reference the source table object inside the function
    const aircraft_cols = AircraftTrackingProcessed_Table?.columns;
    
    // Execute the query with robust optional parameter handling
    const result = await client.query.execute(sql`
      SELECT 
        CASE 
          WHEN ${aircraft_cols.track} >= 0 AND ${aircraft_cols.track} < 45 THEN 'N (0-45°)'
          WHEN ${aircraft_cols.track} >= 45 AND ${aircraft_cols.track} < 90 THEN 'NE (45-90°)'
          WHEN ${aircraft_cols.track} >= 90 AND ${aircraft_cols.track} < 135 THEN 'E (90-135°)'
          WHEN ${aircraft_cols.track} >= 135 AND ${aircraft_cols.track} < 180 THEN 'SE (135-180°)'
          WHEN ${aircraft_cols.track} >= 180 AND ${aircraft_cols.track} < 225 THEN 'S (180-225°)'
          WHEN ${aircraft_cols.track} >= 225 AND ${aircraft_cols.track} < 270 THEN 'SW (225-270°)'
          WHEN ${aircraft_cols.track} >= 270 AND ${aircraft_cols.track} < 315 THEN 'W (270-315°)'
          WHEN ${aircraft_cols.track} >= 315 AND ${aircraft_cols.track} < 360 THEN 'NW (315-360°)'
          ELSE 'Unknown'
        END as direction,
        COUNT(*) as total_records,
        AVG(${aircraft_cols.alt_baro}) as avg_barometric_altitude,
        MIN(${aircraft_cols.alt_baro}) as min_barometric_altitude,
        MAX(${aircraft_cols.alt_baro}) as max_barometric_altitude,
        STDDEV_POP(${aircraft_cols.alt_baro}) as altitude_stddev,
        AVG(${aircraft_cols.gs}) as avg_ground_speed,
        MIN(${aircraft_cols.gs}) as min_ground_speed,
        MAX(${aircraft_cols.gs}) as max_ground_speed,
        STDDEV_POP(${aircraft_cols.gs}) as speed_stddev,
        COUNT(DISTINCT ${aircraft_cols.hex}) as unique_aircraft_count,
        AVG(${aircraft_cols.track}) as avg_heading
      FROM ${AircraftTrackingProcessed_Table} 
      WHERE ${aircraft_cols.alt_baro} > 0 
        AND ${aircraft_cols.gs} > 0 
        AND ${aircraft_cols.track} >= 0
        -- Optional direction filter
        AND (${params.direction || ''} = '' OR 
             CASE 
               WHEN ${aircraft_cols.track} >= 0 AND ${aircraft_cols.track} < 45 THEN 'N (0-45°)'
               WHEN ${aircraft_cols.track} >= 45 AND ${aircraft_cols.track} < 90 THEN 'NE (45-90°)'
               WHEN ${aircraft_cols.track} >= 90 AND ${aircraft_cols.track} < 135 THEN 'E (90-135°)'
               WHEN ${aircraft_cols.track} >= 135 AND ${aircraft_cols.track} < 180 THEN 'SE (135-180°)'
               WHEN ${aircraft_cols.track} >= 180 AND ${aircraft_cols.track} < 225 THEN 'S (180-225°)'
               WHEN ${aircraft_cols.track} >= 225 AND ${aircraft_cols.track} < 270 THEN 'SW (225-270°)'
               WHEN ${aircraft_cols.track} >= 270 AND ${aircraft_cols.track} < 315 THEN 'W (270-315°)'
               WHEN ${aircraft_cols.track} >= 315 AND ${aircraft_cols.track} < 360 THEN 'NW (315-360°)'
               ELSE 'Unknown'
             END = ${params.direction || ''})
        -- Optional altitude range filters
        AND (${params.minAltitude || -999999} = -999999 OR ${aircraft_cols.alt_baro} >= ${params.minAltitude || -999999})
        AND (${params.maxAltitude || 999999} = 999999 OR ${aircraft_cols.alt_baro} <= ${params.maxAltitude || 999999})
        -- Optional speed range filters
        AND (${params.minSpeed || -999999} = -999999 OR ${aircraft_cols.gs} >= ${params.minSpeed || -999999})
        AND (${params.maxSpeed || 999999} = 999999 OR ${aircraft_cols.gs} <= ${params.maxSpeed || 999999})
      GROUP BY direction
      ORDER BY total_records DESC
    `);

    return result;
  },
  {
    metadata: {
      description: "Provides speed and altitude statistics for different aircraft directions (N, NE, E, SE, S, SW, W, NW)",
    },
  }
);
