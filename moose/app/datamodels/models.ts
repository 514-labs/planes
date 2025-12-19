import { Key } from "@514labs/moose-lib";

/**
 * Raw aircraft tracking data from ADS-B Exchange API.
 * Contains real-time telemetry, position, and status information for tracked aircraft.
 */
export interface AircraftTrackingData {
  /** The 24-bit ICAO identifier of the aircraft, as 6 hex digits. May start with '~' for non-ICAO addresses (e.g. from TIS-B). */
  hex: Key<string>;

  /** Type of underlying messages / best source of current data. Values: adsb_icao, adsb_icao_nt, adsr_icao, tisb_icao, adsc, mlat, other, mode_s, adsb_other, adsr_other, tisb_other, tisb_trackfile */
  transponder_type: string;

  /** Callsign, the flight name or aircraft registration as 8 chars */
  flight: string;

  /** Aircraft registration pulled from database */
  r: string;

  /** Aircraft ICAO type code pulled from database (as defined by ICAO DOC8643) */
  aircraft_type?: string;

  /** Bitfield for database flags: military = dbFlags & 1, interesting = dbFlags & 2, PIA = dbFlags & 4, LADD = dbFlags & 8 */
  dbFlags: number;

  /** Aircraft latitude position in decimal degrees */
  lat: number;

  /** Aircraft longitude position in decimal degrees */
  lon: number;

  /** Aircraft barometric altitude in feet. When alt_baro_is_ground is true, aircraft is on ground. */
  alt_baro: number;

  /** Indicates if aircraft is on ground (alt_baro would be "ground" in raw API) */
  alt_baro_is_ground: boolean;

  /** Geometric (GNSS / INS) altitude in feet referenced to the WGS84 ellipsoid */
  alt_geom: number;

  /** Ground speed in knots */
  gs: number;

  /** True track over ground in degrees (0-359) */
  track: number;

  /** Rate of change of barometric altitude, feet/minute */
  baro_rate: number;

  /** Rate of change of geometric (GNSS / INS) altitude, feet/minute */
  geom_rate?: number;

  /** Mode A code (Squawk), encoded as 4 octal digits */
  squawk: string;

  /** ADS-B emergency/priority status, superset of 7x00 squawks. Values: none, general, lifeguard, minfuel, nordo, unlawful, downed, reserved */
  emergency: string;

  /** Emitter category to identify particular aircraft or vehicle classes (values A0-D7) */
  category: string;

  /** Altimeter setting (QFE or QNH/QNE), hPa */
  nav_qnh?: number;

  /** Selected altitude from the Mode Control Panel / Flight Control Unit (MCP/FCU), feet */
  nav_altitude_mcp?: number;

  /** Selected heading (True or Magnetic is not defined in DO-260B, mostly Magnetic) */
  nav_heading?: number;

  /** Set of engaged automation modes: 'autopilot', 'vnav', 'althold', 'approach', 'lnav', 'tcas' */
  nav_modes?: string[];

  /** Navigation Integrity Category - measure of position accuracy */
  nic: number;

  /** Radius of Containment in meters; measure of position integrity derived from NIC & supplementary bits */
  rc: number;

  /** How long ago (in seconds before "now") the position was last updated */
  seen_pos: number;

  /** ADS-B Version Number: 0, 1, 2 (3-7 are reserved) */
  version: number;

  /** Navigation Integrity Category for Barometric Altitude */
  nic_baro: number;

  /** Navigation Accuracy for Position */
  nac_p: number;

  /** Navigation Accuracy for Velocity */
  nac_v: number;

  /** Source Integrity Level */
  sil: number;

  /** Source Integrity Level type: unknown, perhour, persample */
  sil_type: string;

  /** Geometric Vertical Accuracy */
  gva: number;

  /** System Design Assurance */
  sda: number;

  /** Flight status alert bit */
  alert: number;

  /** Flight status special position identification bit */
  spi: number;

  /** List of fields derived from MLAT data */
  mlat: string[];

  /** List of fields derived from TIS-B data */
  tisb: string[];

  /** Total number of Mode S messages received from this aircraft */
  messages: number;

  /** How long ago (in seconds before "now") a message was last received from this aircraft */
  seen: number;

  /** Recent average RSSI (signal power) in dBFS; always negative */
  rssi: number;

  /** Timestamp when this data was captured */
  timestamp: Date;
}

/**
 * Processed aircraft tracking data with derived fields.
 * Extends raw tracking data with computed values for spatial indexing and decoded nav_modes.
 */
export interface AircraftTrackingProcessed extends AircraftTrackingData {
  /** Z-order curve coordinate for efficient spatial queries */
  zorderCoordinate: Key<number>;

  /** Approach mode engaged (decoded from nav_modes) */
  approach: boolean;

  /** Autopilot mode engaged (decoded from nav_modes) */
  autopilot: boolean;

  /** Altitude hold mode engaged (decoded from nav_modes) */
  althold: boolean;

  /** Lateral navigation mode engaged (decoded from nav_modes) */
  lnav: boolean;

  /** Traffic Collision Avoidance System mode engaged (decoded from nav_modes) */
  tcas: boolean;
}
