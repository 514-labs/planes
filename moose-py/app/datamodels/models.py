from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from moose_lib import Key


class AircraftTrackingData(BaseModel):
    """Raw aircraft tracking data from ADS-B Exchange API.
    Contains real-time telemetry, position, and status information for tracked aircraft.
    """
    model_config = ConfigDict(use_attribute_docstrings=True)

    hex: Key[str]
    """The 24-bit ICAO identifier of the aircraft, as 6 hex digits. May start with '~' for non-ICAO addresses (e.g. from TIS-B)."""

    transponder_type: str
    """Type of underlying messages / best source of current data. Values: adsb_icao, adsb_icao_nt, adsr_icao, tisb_icao, adsc, mlat, other, mode_s, adsb_other, adsr_other, tisb_other, tisb_trackfile"""

    flight: str
    """Callsign, the flight name or aircraft registration as 8 chars"""

    r: str
    """Aircraft registration pulled from database"""

    aircraft_type: Optional[str] = None
    """Aircraft ICAO type code pulled from database (as defined by ICAO DOC8643)"""

    dbFlags: int
    """Bitfield for database flags: military = dbFlags & 1, interesting = dbFlags & 2, PIA = dbFlags & 4, LADD = dbFlags & 8"""

    lat: float
    """Aircraft latitude position in decimal degrees"""

    lon: float
    """Aircraft longitude position in decimal degrees"""

    alt_baro: float
    """Aircraft barometric altitude in feet. When alt_baro_is_ground is true, aircraft is on ground."""

    alt_baro_is_ground: bool
    """Indicates if aircraft is on ground (alt_baro would be "ground" in raw API)"""

    alt_geom: float
    """Geometric (GNSS / INS) altitude in feet referenced to the WGS84 ellipsoid"""

    gs: float
    """Ground speed in knots"""

    track: float
    """True track over ground in degrees (0-359)"""

    baro_rate: float
    """Rate of change of barometric altitude, feet/minute"""

    geom_rate: Optional[float] = None
    """Rate of change of geometric (GNSS / INS) altitude, feet/minute"""

    squawk: str
    """Mode A code (Squawk), encoded as 4 octal digits"""

    emergency: str
    """ADS-B emergency/priority status, superset of 7x00 squawks. Values: none, general, lifeguard, minfuel, nordo, unlawful, downed, reserved"""

    category: str
    """Emitter category to identify particular aircraft or vehicle classes (values A0-D7)"""

    nav_qnh: Optional[float] = None
    """Altimeter setting (QFE or QNH/QNE), hPa"""

    nav_altitude_mcp: Optional[float] = None
    """Selected altitude from the Mode Control Panel / Flight Control Unit (MCP/FCU), feet"""

    nav_heading: Optional[float] = None
    """Selected heading (True or Magnetic is not defined in DO-260B, mostly Magnetic)"""

    nav_modes: Optional[List[str]] = None
    """Set of engaged automation modes: 'autopilot', 'vnav', 'althold', 'approach', 'lnav', 'tcas'"""

    nic: int
    """Navigation Integrity Category - measure of position accuracy"""

    rc: int
    """Radius of Containment in meters; measure of position integrity derived from NIC & supplementary bits"""

    seen_pos: int
    """How long ago (in seconds before "now") the position was last updated"""

    version: int
    """ADS-B Version Number: 0, 1, 2 (3-7 are reserved)"""

    nic_baro: int
    """Navigation Integrity Category for Barometric Altitude"""

    nac_p: int
    """Navigation Accuracy for Position"""

    nac_v: int
    """Navigation Accuracy for Velocity"""

    sil: int
    """Source Integrity Level"""

    sil_type: str
    """Source Integrity Level type: unknown, perhour, persample"""

    gva: int
    """Geometric Vertical Accuracy"""

    sda: int
    """System Design Assurance"""

    alert: int
    """Flight status alert bit"""

    spi: int
    """Flight status special position identification bit"""

    mlat: List[str]
    """List of fields derived from MLAT data"""

    tisb: List[str]
    """List of fields derived from TIS-B data"""

    messages: int
    """Total number of Mode S messages received from this aircraft"""

    seen: int
    """How long ago (in seconds before "now") a message was last received from this aircraft"""

    rssi: float
    """Recent average RSSI (signal power) in dBFS; always negative"""

    timestamp: str
    """Timestamp when this data was captured (ISO format)"""


class AircraftTrackingProcessed(AircraftTrackingData):
    """Processed aircraft tracking data with derived fields.
    Extends raw tracking data with computed values for spatial indexing and decoded nav_modes.
    """
    model_config = ConfigDict(use_attribute_docstrings=True)

    zorderCoordinate: Key[int]
    """Z-order curve coordinate for efficient spatial queries"""

    approach: bool
    """Approach mode engaged (decoded from nav_modes)"""

    autopilot: bool
    """Autopilot mode engaged (decoded from nav_modes)"""

    althold: bool
    """Altitude hold mode engaged (decoded from nav_modes)"""

    lnav: bool
    """Lateral navigation mode engaged (decoded from nav_modes)"""

    tcas: bool
    """Traffic Collision Avoidance System mode engaged (decoded from nav_modes)"""
