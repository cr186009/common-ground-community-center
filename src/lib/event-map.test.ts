import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEventLocationQuery,
  mapEventsToApproximatePoints,
} from "./event-map";

const event = {
  id: "event-1",
  title: "Market",
  locationName: "Downtown Square",
  address: "100 Main St",
  city: " Dallas ",
  county: "Paulding",
  startDateTime: new Date("2026-09-05T13:00:00.000Z"),
  endDateTime: new Date("2026-09-05T18:00:00.000Z"),
  isAllDay: false,
};

test("location queries are deterministic and include venue through state", () => {
  assert.equal(
    buildEventLocationQuery(event),
    "Downtown Square, 100 Main St, Dallas, Paulding County, Georgia",
  );
});

test("known cities receive explicitly approximate points and unknown cities are skipped", () => {
  const points = mapEventsToApproximatePoints([
    event,
    { ...event, id: "unknown", city: "Unknown Place" },
  ]);
  assert.equal(points.length, 1);
  assert.equal(points[0].precision, "city-center");
  assert.equal(points[0].dateTimeLabel, "Sat, Sep 5, 9:00 AM - 2:00 PM");
  assert.deepEqual(
    { latitude: points[0].latitude, longitude: points[0].longitude },
    { latitude: 33.9237, longitude: -84.8408 },
  );
});
