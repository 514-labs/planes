import { getMooseUtils, WebApp, buildQuery } from "@514labs/moose-lib";
import { aircraftStatsModel } from "../queries/aircraftStats";
import express, { Request } from "express";
import cors from "cors";

interface AircraftSpeedAltitudeParams {
  category?: string;
  minAltitude?: string;
  maxAltitude?: string;
  minSpeed?: string;
  maxSpeed?: string;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get(
  "/aircraftSpeedAltitudeByType",
  async (
    req: Request<{}, {}, {}, AircraftSpeedAltitudeParams>,
    res,
  ) => {
    const { client } = await getMooseUtils();
    const params = req.query;

    const results = await buildQuery(aircraftStatsModel)
      .filter("altitude", "gt", 0)
      .filter("speed", "gt", 0)
      .filter("category", "ne", "")
      .filter("category", "eq", params.category)
      .filter(
        "altitude",
        "gte",
        params.minAltitude ? Number(params.minAltitude) : undefined,
      )
      .filter(
        "altitude",
        "lte",
        params.maxAltitude ? Number(params.maxAltitude) : undefined,
      )
      .filter(
        "speed",
        "gte",
        params.minSpeed ? Number(params.minSpeed) : undefined,
      )
      .filter(
        "speed",
        "lte",
        params.maxSpeed ? Number(params.maxSpeed) : undefined,
      )
      .execute(client.query);

    res.json(results);
  },
);

new WebApp("aircraft", app, {
  mountPath: "/aircraft/api",
  metadata: {
    description: "API for consuming aircraft data",
  },
});
