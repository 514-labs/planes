import {
  OlapTable,
  MaterializedView,
  ClickHouseEngines,
  Aggregated,
  SimpleAggregated,
  sql,
} from "@514labs/moose-lib";
import { AircraftTrackingProcessed_Table } from "./ingest";

/**
 * Pre-aggregated aircraft statistics by category.
 *
 * Populated incrementally via a MaterializedView on insert into
 * AircraftTrackingProcessedTable, so the dashboard no longer needs
 * to full-scan 63 M+ rows on every page load.
 */
interface AircraftStatsByCategory {
  category: string;
  total_records: number & SimpleAggregated<"sum", number>;
  sum_alt_baro: number & SimpleAggregated<"sum", number>;
  min_alt_baro: number & SimpleAggregated<"min", number>;
  max_alt_baro: number & SimpleAggregated<"max", number>;
  sum_gs: number & SimpleAggregated<"sum", number>;
  min_gs: number & SimpleAggregated<"min", number>;
  max_gs: number & SimpleAggregated<"max", number>;
  avg_alt_baro: number & Aggregated<"avg", [number]>;
  stddev_alt_baro: number & Aggregated<"stddevPop", [number]>;
  avg_gs: number & Aggregated<"avg", [number]>;
  stddev_gs: number & Aggregated<"stddevPop", [number]>;
  unique_aircraft: number & Aggregated<"uniq", [string]>;
}

export const AircraftStatsByCategory_Table =
  new OlapTable<AircraftStatsByCategory>("AircraftStatsByCategoryTable", {
    engine: ClickHouseEngines.AggregatingMergeTree,
    orderByFields: ["category"],
  });

const src = AircraftTrackingProcessed_Table;

export const AircraftStatsByCategory_MV =
  new MaterializedView<AircraftStatsByCategory>({
    materializedViewName: "AircraftStatsByCategoryMV",
    selectTables: [src],
    targetTable: AircraftStatsByCategory_Table,
    selectStatement: sql.statement`
      SELECT
        ${src.columns.category}                     AS category,
        count()                                     AS total_records,
        sum(${src.columns.alt_baro})                AS sum_alt_baro,
        min(${src.columns.alt_baro})                AS min_alt_baro,
        max(${src.columns.alt_baro})                AS max_alt_baro,
        sum(${src.columns.gs})                      AS sum_gs,
        min(${src.columns.gs})                      AS min_gs,
        max(${src.columns.gs})                      AS max_gs,
        avgState(${src.columns.alt_baro})           AS avg_alt_baro,
        stddevPopState(${src.columns.alt_baro})     AS stddev_alt_baro,
        avgState(${src.columns.gs})                 AS avg_gs,
        stddevPopState(${src.columns.gs})           AS stddev_gs,
        uniqState(${src.columns.hex})               AS unique_aircraft
      FROM ${src}
      WHERE ${src.columns.alt_baro} > 0
        AND ${src.columns.gs} > 0
        AND ${src.columns.category} != ''
      GROUP BY ${src.columns.category}
    `,
  });
