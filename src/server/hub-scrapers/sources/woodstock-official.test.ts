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
      eventLink: "/event/jazz",
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
  assert.equal(events[0].isAllDay, false);
  assert.equal(events[0].originalUrl, "https://visitwoodstockga.com/event/jazz");
  assert.equal(events[0].sourceUrl, source.url);
  assert.equal(events[0].startDateTime.toISOString(), "2026-08-01T22:00:00.000Z");
  assert.equal(events[0].description, "A free outdoor event.");
});

test("rejects past, cancelled, blocked, and invalid Woodstock records", () => {
  const base = { title: "Example", startTime: "2026-08-02T12:00:00Z" };
  const events = parseWoodstockEvents([
    { ...base, isCancelled: true },
    { ...base, isBlocked: true },
    { ...base, title: "Past", startTime: "2025-08-02T12:00:00Z" },
    { title: "Missing date" },
    { ...base, title: "", description: "missing title" },
  ], source, new Date("2026-07-31T12:00:00Z"));

  assert.deepEqual(events, []);
});

test("falls back to the trusted source URL for a malformed event link", () => {
  const [event] = parseWoodstockEvents([
    { title: "Community Night", startTime: "2026-08-02T22:00:00Z", eventLink: "http://[bad" },
  ], source, new Date("2026-07-31T12:00:00Z"));

  assert.equal(event.originalUrl, source.url);
});
