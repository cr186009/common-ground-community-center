import assert from "node:assert/strict";
import test from "node:test";
import { verifyEventDateTime } from "../date-verification";
import { parsePlayCherokeeResponse } from "./play-cherokee";

const source = { name: "Cherokee Recreation & Parks events", url: "https://playcherokee.org/events/" };
test("keeps only Play Cherokee events with verified Canton venues", () => {
  const events = parsePlayCherokeeResponse({ events: [
    { id: 121, title: "Paws in the Pool", start_date: "2026-09-13 12:00:00", end_date: "2026-09-13 16:30:00", url: "/event/paws/2026-09-13/", status: "publish", venue: { venue: "Aquatic Center", address: "1200 Wellstar Way", city: "Canton", state: "GA", zip: "30114" } },
    { id: 122, title: "Woodstock Event", start_date: "2026-09-13 12:00:00", status: "publish", venue: { city: "Woodstock" } },
    { id: 123, title: "Unlocated Promotion", start_date: "2026-09-13 12:00:00", status: "publish", venue: [] },
  ] }, source, new Date("2026-08-01T12:00:00Z"));
  assert.equal(events.length, 1);
  assert.equal(events[0].startDateTime.toISOString(), "2026-09-13T16:00:00.000Z");
  assert.equal(events[0].originalUrl, "https://playcherokee.org/event/paws/2026-09-13/");
  assert.equal(verifyEventDateTime(events[0]).time.status, "VERIFIED");
});

test("rejects cancelled and past Play Cherokee records", () => {
  assert.deepEqual(parsePlayCherokeeResponse({ events: [
    { title: "Cancelled", start_date: "2027-01-01 10:00:00", status: "cancelled", venue: { city: "Canton" } },
    { title: "Past", start_date: "2025-01-01 10:00:00", status: "publish", venue: { city: "Canton" } },
  ] }, source, new Date("2026-08-01T12:00:00Z")), []);
});
