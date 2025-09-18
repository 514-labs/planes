import asyncio
import aiohttp
from typing import List, Dict, Any, Optional
from moose_lib import Task, Workflow, TaskConfig, WorkflowConfig
from pydantic import BaseModel
from app.datamodels.models import AircraftTrackingData


class ApiResponse:
    """Interface for API response from adsb.lol"""
    def __init__(self, ac: List[Dict[str, Any]], total: Optional[int] = None, 
                 ctime: Optional[int] = None, ptime: Optional[int] = None):
        self.ac = ac
        self.total = total
        self.ctime = ctime
        self.ptime = ptime

def map_to_aircraft_tracking_data(aircraft: Dict[str, Any], timestamp: str) -> AircraftTrackingData:
    """Maps API aircraft data to AircraftTrackingData format"""
    # Handle alt_baro which can be "ground" or a number
    alt_baro = 0
    alt_baro_is_ground = False

    if isinstance(aircraft.get("alt_baro"), str) and aircraft["alt_baro"] == "ground":
        alt_baro = 0  # Set to 0 for ground
        alt_baro_is_ground = True
    elif isinstance(aircraft.get("alt_baro"), (int, float)) and aircraft["alt_baro"] == 0:
        alt_baro_is_ground = True
    else:
        alt_baro = aircraft.get("alt_baro", 0) or 0

    return AircraftTrackingData(
        hex=aircraft.get("hex", ""),
        transponder_type=aircraft.get("transponder_type", ""),
        flight=aircraft.get("flight", ""),
        r=aircraft.get("r", ""),
        aircraft_type=aircraft.get("aircraft_type"),
        dbFlags=aircraft.get("dbFlags", 0),
        lat=aircraft.get("lat", 0),
        lon=aircraft.get("lon", 0),
        alt_baro=alt_baro,
        alt_baro_is_ground=alt_baro_is_ground,
        alt_geom=aircraft.get("alt_geom", 0),
        gs=aircraft.get("gs", 0),
        track=aircraft.get("track", 0),
        baro_rate=aircraft.get("baro_rate", 0),
        geom_rate=aircraft.get("geom_rate"),
        squawk=aircraft.get("squawk", ""),
        emergency=aircraft.get("emergency", ""),
        category=aircraft.get("category", ""),
        nav_qnh=aircraft.get("nav_qnh"),
        nav_altitude_mcp=aircraft.get("nav_altitude_mcp"),
        nav_heading=aircraft.get("nav_heading"),
        nav_modes=aircraft.get("nav_modes"),
        nic=aircraft.get("nic", 0),
        rc=aircraft.get("rc", 0),
        seen_pos=int(aircraft.get("seen_pos", 0)),
        version=aircraft.get("version", 0),
        nic_baro=aircraft.get("nic_baro", 0),
        nac_p=aircraft.get("nac_p", 0),
        nac_v=aircraft.get("nac_v", 0),
        sil=aircraft.get("sil", 0),
        sil_type=aircraft.get("sil_type", ""),
        gva=aircraft.get("gva", 0),
        sda=aircraft.get("sda", 0),
        alert=aircraft.get("alert", 0),
        spi=aircraft.get("spi", 0),
        mlat=aircraft.get("mlat", []),
        tisb=aircraft.get("tisb", []),
        messages=aircraft.get("messages", 0),
        seen=int(aircraft.get("seen", 0)),
        rssi=aircraft.get("rssi", 0),
        timestamp=timestamp,
    )


async def fetch_and_ingest_military_aircraft_task(context) -> None:
    """Task to fetch military aircraft data from adsb.lol API and ingest it"""
    try:
        api_url = "https://api.adsb.lol/v2/mil"

        print(f"Fetching military aircraft data from {api_url}")

        # Fetch data from API with timeout
        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(api_url) as response:
                if not response.ok:
                    raise Exception(f"API request failed with status: {response.status} {response.reason}")

                data = await response.json()

        if not data.get("ac") or not isinstance(data["ac"], list):
            print("No aircraft data found in API response")
            return

        print(f"Fetched {len(data['ac'])} military aircraft records")

        # Process each aircraft and send to ingestion endpoint
        import datetime
        timestamp = datetime.datetime.now().isoformat()
        processed_count = 0

        for aircraft in data["ac"]:
            try:
                mapped_data = map_to_aircraft_tracking_data(aircraft, timestamp)

                # Send individual aircraft data to Moose ingestion endpoint
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        "http://localhost:4000/ingest/AircraftTrackingDataIngestAPI",
                        json=mapped_data.dict(),
                        headers={"Content-Type": "application/json"}
                    ) as ingest_response:
                        if ingest_response.ok:
                            processed_count += 1
                        else:
                            print(f"Failed to ingest aircraft {aircraft.get('hex')}: {ingest_response.status} {ingest_response.reason}")

            except Exception as error:
                print(f"Error processing aircraft {aircraft.get('hex')}: {error}")

        print(f"Successfully processed {processed_count} out of {len(data['ac'])} aircraft records")

    except Exception as error:
        print(f"Error in fetch_and_ingest_military_aircraft task: {error}")
        raise error


# Create the task
fetch_and_ingest_military_aircraft = Task[None, None](
    "fetch_and_ingest_military_aircraft",
    TaskConfig(
        run=fetch_and_ingest_military_aircraft_task,
        retries=3,
        timeout="5m"
    )
)

# Create the workflow
military_aircraft_tracking_workflow = Workflow(
    "military_aircraft_tracking",
    WorkflowConfig(
        starting_task=fetch_and_ingest_military_aircraft,
        retries=3,
        timeout="1h",
        schedule="@every 30s"
    )
)


def default():
    """Default export function that returns the workflow instance"""
    return military_aircraft_tracking_workflow
