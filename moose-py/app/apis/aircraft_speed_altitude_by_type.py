from typing import Optional
from moose_lib import Api, MooseClient
from pydantic import BaseModel
from app.ingest.aircraft_tracking import AircraftTrackingProcessed_Table


class AircraftSpeedAltitudeParams(BaseModel):
    """Parameters for the aircraft speed and altitude by type API"""
    category: Optional[str] = None
    min_altitude: Optional[float] = None
    max_altitude: Optional[float] = None
    min_speed: Optional[float] = None
    max_speed: Optional[float] = None


class AircraftSpeedAltitudeResult(BaseModel):
    """Result for the aircraft speed and altitude by type API"""
    aircraft_category: str
    total_records: int
    avg_barometric_altitude: float
    min_barometric_altitude: float
    max_barometric_altitude: float
    altitude_stddev: float
    avg_ground_speed: float
    min_ground_speed: float
    max_ground_speed: float
    speed_stddev: float
    unique_aircraft_count: int


def aircraft_speed_altitude_by_type_handler(client: MooseClient, params: AircraftSpeedAltitudeParams):
    """API that provides speed and altitude statistics for different aircraft types/categories"""
    # Use the table object to get the table name and column names
    source = AircraftTrackingProcessed_Table
    
    # Execute the query with robust optional parameter handling
    query = f"""
        SELECT 
            {source.columns.category} as aircraft_category,
            COUNT(*) as total_records,
            AVG({source.columns.alt_baro}) as avg_barometric_altitude,
            MIN({source.columns.alt_baro}) as min_barometric_altitude,
            MAX({source.columns.alt_baro}) as max_barometric_altitude,
            STDDEV_POP({source.columns.alt_baro}) as altitude_stddev,
            AVG({source.columns.gs}) as avg_ground_speed,
            MIN({source.columns.gs}) as min_ground_speed,
            MAX({source.columns.gs}) as max_ground_speed,
            STDDEV_POP({source.columns.gs}) as speed_stddev,
            COUNT(DISTINCT {source.columns.hex}) as unique_aircraft_count
        FROM {source.name} 
        WHERE {source.columns.alt_baro} > 0 
            AND {source.columns.gs} > 0 
            AND {source.columns.category} != ''
            -- Optional category filter
            AND ('{params.category or ''}' = '' OR {source.columns.category} = '{params.category or ''}')
            -- Optional altitude range filters
            AND ({params.min_altitude or -999999} = -999999 OR {source.columns.alt_baro} >= {params.min_altitude or -999999})
            AND ({params.max_altitude or 999999} = 999999 OR {source.columns.alt_baro} <= {params.max_altitude or 999999})
            -- Optional speed range filters
            AND ({params.min_speed or -999999} = -999999 OR {source.columns.gs} >= {params.min_speed or -999999})
            AND ({params.max_speed or 999999} = 999999 OR {source.columns.gs} <= {params.max_speed or 999999})
        GROUP BY {source.columns.category} 
        ORDER BY total_records DESC
    """
    
    # Execute the query with parameters
    result = client.query.execute(query, {
        "category": params.category,
        "min_altitude": params.min_altitude,
        "max_altitude": params.max_altitude,
        "min_speed": params.min_speed,
        "max_speed": params.max_speed
    })
    return result


# Create the API
aircraft_speed_altitude_by_type = Api[AircraftSpeedAltitudeParams, AircraftSpeedAltitudeResult](
    name="aircraftSpeedAltitudeByType",
    query_function=aircraft_speed_altitude_by_type_handler
)
