from pydantic import BaseModel
from typing import Optional, List
from moose_lib import Key


class AircraftTrackingData(BaseModel):
    """Raw aircraft tracking data from ADS-B sources"""
    
    # Aircraft identifiers
    hex: Key[str]  # using hex as the key since it appears to be a unique aircraft identifier
    transponder_type: str
    flight: str
    r: str
    aircraft_type: Optional[str] = None
    dbFlags: int

    # Position data
    lat: float
    lon: float
    alt_baro: float
    alt_baro_is_ground: bool
    alt_geom: float
    gs: float  # ground speed
    track: float
    baro_rate: float
    geom_rate: Optional[float] = None
    squawk: str

    # Status information
    emergency: str
    category: str
    nav_qnh: Optional[float] = None
    nav_altitude_mcp: Optional[float] = None
    nav_heading: Optional[float] = None
    nav_modes: Optional[List[str]] = None

    # Technical parameters
    nic: int
    rc: int
    seen_pos: int
    version: int
    nic_baro: int
    nac_p: int
    nac_v: int
    sil: int
    sil_type: str
    gva: int
    sda: int

    # Status flags
    alert: int
    spi: int

    # Arrays
    mlat: List[str]
    tisb: List[str]

    # Additional metrics
    messages: int
    seen: int
    rssi: float

    # Timestamp
    timestamp: str  # ISO format timestamp


class AircraftTrackingProcessed(AircraftTrackingData):
    """Processed aircraft tracking data with additional computed fields"""
    
    zorderCoordinate: Key[int]
    approach: bool
    autopilot: bool
    althold: bool
    lnav: bool
    tcas: bool
