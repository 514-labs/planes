from moose_lib import OlapTable, Stream, IngestApi, IngestConfigWithDestination, DeadLetterQueue, IngestPipeline, IngestPipelineConfig, StreamConfig
from app.datamodels.models import AircraftTrackingData, AircraftTrackingProcessed
from app.functions.process_aircraft import transform_aircraft

# Raw data ingest pipeline
AircraftTrackingData_Table = OlapTable[AircraftTrackingData]("AircraftTrackingDataTable")

AircraftTrackingData_Stream = Stream[AircraftTrackingData]("AircraftTrackingDataStream", StreamConfig(
    destination=AircraftTrackingData_Table
))

AircraftTrackingData_IngestAPI = IngestApi[AircraftTrackingData]("AircraftTrackingDataIngestAPI", IngestConfigWithDestination(
    destination=AircraftTrackingData_Stream,
    dead_letter_queue=DeadLetterQueue[AircraftTrackingData]("AircraftTrackingDataDLQ")
))

# Derivative data model pipeline
AircraftTrackingProcessed_Table = OlapTable[AircraftTrackingProcessed]("AircraftTrackingProcessedTable")

AircraftTrackingProcessed_Stream = Stream[AircraftTrackingProcessed]("AircraftTrackingProcessedStream", StreamConfig(
    destination=AircraftTrackingProcessed_Table
))

# Add transformation from raw data to processed data
AircraftTrackingData_Stream.add_transform(
    AircraftTrackingProcessed_Stream,
    transform_aircraft
)
