from typing import Optional, Any, List
import logging

from fastapi import FastAPI, Query, Request, HTTPException  # pyright: ignore[reportMissingImports]
from fastapi.middleware.cors import CORSMiddleware  # pyright: ignore[reportMissingImports]
from moose_lib.dmv2 import WebApp, WebAppConfig, WebAppMetadata
from moose_lib.dmv2.web_app_helpers import get_moose_utils
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from app.ingest.aircraft_tracking import AircraftTrackingProcessed_Table

app = FastAPI(
    title="Aircraft API",
    description="API for consuming aircraft data",
    version="1.0.0",
)

# Keep this permissive to match the TS Express implementation (which enables CORS).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AircraftSpeedAltitudeByTypeRow(BaseModel):
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


@app.get("/aircraftSpeedAltitudeByType")
async def aircraftSpeedAltitudeByType(
    request: Request,
    category: Optional[str] = Query(default=None),
    minAltitude: Optional[float] = Query(default=None),
    maxAltitude: Optional[float] = Query(default=None),
    minSpeed: Optional[float] = Query(default=None),
    maxSpeed: Optional[float] = Query(default=None),
):
    """
    Provides speed and altitude statistics for different aircraft types/categories.
    Uses barometric altitude (NOT geometric altitude) and ground speed.
    """
    try:
        moose = get_moose_utils(request)
        if not moose:
            raise HTTPException(status_code=500, detail="MooseStack utilities not available")
        
        source = AircraftTrackingProcessed_Table
        
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
                AND ('{category or ''}' = '' OR {source.columns.category} = '{category or ''}')
                -- Optional altitude range filters
                AND ({minAltitude or -999999} = -999999 OR {source.columns.alt_baro} >= {minAltitude or -999999})
                AND ({maxAltitude or 999999} = 999999 OR {source.columns.alt_baro} <= {maxAltitude or 999999})
                -- Optional speed range filters
                AND ({minSpeed or -999999} = -999999 OR {source.columns.gs} >= {minSpeed or -999999})
                AND ({maxSpeed or 999999} = 999999 OR {source.columns.gs} <= {maxSpeed or 999999})
            GROUP BY {source.columns.category} 
            ORDER BY total_records DESC
        """

        # Execute query and get results
        result = moose.client.query.execute_raw(query, parameters={})

        # Handle result - some implementations return a wrapper with .json() method
        if hasattr(result, "json") and callable(getattr(result, "json")):
            return result.json()

        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in aircraftSpeedAltitudeByType")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# Register as MooseStack WebApp (FastAPI mounted into the project)
aircraft_fastapi_app = WebApp(
    "aircraft",
    app,
    WebAppConfig(
        mount_path="/aircraft/api",
        metadata=WebAppMetadata(description="API for consuming aircraft data"),
    ),
)

