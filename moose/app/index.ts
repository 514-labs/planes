// export * from "./connectors/fetch_and_ingest_military_aircraft";
export * from "./apis/aircraftSpeedAltitudeByType";
export * from "./apis/mcp";
export * from "./ingest/ingest";
export * from "./ingest/aircraft_stats_mv";

import { OlapTable } from "@514labs/moose-lib";
import { AircraftTrackingData } from "./datamodels/models";

const t1 = new OlapTable<AircraftTrackingData>("t", {
  version: "0.0",
});
