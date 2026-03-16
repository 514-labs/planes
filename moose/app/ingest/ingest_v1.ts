import { OlapTable } from "@514labs/moose-lib";
import {
  AircraftTrackingData,
  AircraftTrackingProcessed,
} from "../datamodels/models";

export const AircraftTrackingData_Table_v1 =
  new OlapTable<AircraftTrackingData>("AircraftTrackingDataTable", {
    orderByFields: ["hex", "timestamp"],
    partitionBy: "toYYYYMM(timestamp)",
    version: "0.1",
  });

//Derivative data model pipeline
export const AircraftTrackingProcessed_Table_v1 =
  new OlapTable<AircraftTrackingProcessed>("AircraftTrackingProcessedTable", {
    orderByFields: ["category", "hex", "timestamp"],
    partitionBy: "toYYYYMM(timestamp)",
    version: "0.1",
  });
