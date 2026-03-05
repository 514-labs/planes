import { describe, expect, it } from "vitest";
import { AircraftTrackingProcessed_Table } from "planes-moose";

const BASE_URL = process.env.MOOSE_BASE_URL ?? "http://localhost:4000";
const AIRCRAFT_SPEED_ALTITUDE_ROUTE = "/aircraft/api/aircraftSpeedAltitudeByType";

describe("Moose API end-to-end", () => {
  it("imports real Moose objects directly", () => {
    expect(AircraftTrackingProcessed_Table).toBeDefined();
    expect(AircraftTrackingProcessed_Table.name).toBe("AircraftTrackingProcessedTable");
  });

  it("returns category stats from the aircraft dashboard endpoint", async () => {
    const response = await fetch(`${BASE_URL}${AIRCRAFT_SPEED_ALTITUDE_ROUTE}`);

    expect(response.ok).toBe(true);

    const data = (await response.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(data)).toBe(true);
  });
});
