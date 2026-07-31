import assert from "node:assert/strict";
import test from "node:test";

import { parseWoodstockEvents } from "./woodstock-official";

const source = { name: "Visit Woodstock", url: "https://visitwoodstockga.com/events/", city: "Woodstock", county: "Cherokee" };

test("parses and expands approved Woodstock calendar event times", () => {
  const events = parseWoodstockEvents([
    {
      _id: "abc",
      title: "Family Music &amp; Art Night",
      description: "<p>A free outdoor event.</p>",
      eventLink: "https://visitwoodstockga.com/event/jazz",
      cover: { source: "https://example.com/jazz.jpg" },
      venueInfo: { name: "The Reeves House" },
      address: { address: "734 Reeves St, Woodstock, GA" },
      eventTimes: [
        { startTime: "2026-08-01T22:00:00.000Z", endTime: "2026-08-02T01:00:00.000Z" },
        { startTime: "2026-08-08T22:00:00.000Z", endTime: "2026-08-09T01:00:00.000Z" },
      ],
    },
  ], source, new Date("2026-07-31T12:00:00Z"));

  assert.equal(events.length, 2);
  assert.equal(events[0].title, "Family Music &amp; Art Night");
  assert.equal(events[0].category, "MUSIC");
  assert.equal(events[0].isFree, true);
  assert.equal(events[0].timeZone, "America/New_York");
});

test("rejects past, cancelled, blocked, and invalid Woodstock records", () => {
  const base = { title: "Example", startTime: "2026-08-02T12:00:00Z" };
  const events = parseWoodstockEvents([
    { ...base, isCancelled: true },
    { ...base, isBlocked: true },
    { ...base, title: "Past", startTime: "2025-08-02T12:00:00Z" },
    { title: "Missing date" },
  ], source, new Date("2026-07-31T12:00:00Z"));

  assert.deepEqual(events, []);
});
