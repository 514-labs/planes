from app.datamodels.models import AircraftTrackingData, AircraftTrackingProcessed
from typing import Optional, List


def calculate_z_order(lat: float, lon: float) -> int:
    """Calculate Z-order curve value for spatial indexing"""
    # Normalize lat/lon to integers between 0 and 2^20
    lat_int = int(((lat + 90.0) * (1 << 20)) / 180.0)
    lon_int = int(((lon + 180.0) * (1 << 20)) / 360.0)

    # Interleave bits
    result = 0
    for i in range(20):
        result |= ((lat_int & (1 << i)) << i) | ((lon_int & (1 << i)) << (i + 1))
    return result


def parse_nav_modes(nav_modes: Optional[List[str]]) -> dict:
    """Converts NavModes list to boolean flags"""
    return {
        "approach": "approach" in (nav_modes or []),
        "autopilot": "autopilot" in (nav_modes or []),
        "althold": "althold" in (nav_modes or []),
        "lnav": "lnav" in (nav_modes or []),
        "tcas": "tcas" in (nav_modes or []),
    }


def transform_aircraft(record: AircraftTrackingData) -> AircraftTrackingProcessed:
    """Transform raw aircraft data to processed format with additional computed fields"""
    zorder_coordinate = calculate_z_order(record.lat, record.lon)
    nav_flags = parse_nav_modes(record.nav_modes)
    
    return AircraftTrackingProcessed(
        **record.dict(),
        zorderCoordinate=zorder_coordinate,
        approach=nav_flags["approach"],
        autopilot=nav_flags["autopilot"],
        althold=nav_flags["althold"],
        lnav=nav_flags["lnav"],
        tcas=nav_flags["tcas"],
    )
