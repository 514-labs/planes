import { OlapTable, Stream, IngestApi, DeadLetterQueue } from "@514labs/moose-lib";
import { AircraftTrackingData, AircraftTrackingProcessed } from "../datamodels/models";
import { transformAircraft } from "../functions/process_aircraft";

//Raw data ingest pipeline
export const AircraftTrackingData_Table = new OlapTable<AircraftTrackingData>("AircraftTrackingDataTable");

export const AircraftTrackingData_Stream = new Stream<AircraftTrackingData>("AircraftTrackingDataStream", {
  destination: AircraftTrackingData_Table
});

export const AircraftTrackingData_IngestAPI = new IngestApi<AircraftTrackingData>("AircraftTrackingDataIngestAPI", {
  destination: AircraftTrackingData_Stream,
  deadLetterQueue: new DeadLetterQueue<AircraftTrackingData>("AircraftTrackingDataDLQ")
});

//Derivative data model pipeline
export const AircraftTrackingProcessed_Table = new OlapTable<AircraftTrackingProcessed>("AircraftTrackingProcessedTable");

export const AircraftTrackingProcessed_Stream = new Stream<AircraftTrackingProcessed>("AircraftTrackingProcessedStream", {
  destination: AircraftTrackingProcessed_Table
});

AircraftTrackingData_Stream!.addTransform(
  AircraftTrackingProcessed_Stream!,
  transformAircraft,
  { metadata: { description: "transformAircraft" } }
);
