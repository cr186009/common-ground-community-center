import assert from "node:assert/strict";
import test from "node:test";

import { createCalendarUrl } from "./hub-format";

function params(input: Parameters<typeof createCalendarUrl>[0]) {
  return new URL(createCalendarUrl(input)).searchParams;
}

test("calendar URLs retain corrected timed Eastern instants", () => {
  const output = params({ title: "WSAB", start: new Date("2026-08-19T12:30:00Z"), end: new Date("2026-08-19T14:00:00Z") });
  assert.equal(output.get("dates"), "20260819T123000Z/20260819T140000Z");
  assert.equal(output.get("ctz"), "America/New_York");
});

test("calendar URLs use date-only, exclusive-end values for all-day events", () => {
  const output = params({ title: "Labor Day", start: new Date("2026-09-07T04:00:00Z"), isAllDay: true });
  assert.equal(output.get("dates"), "20260907/20260908");
});

test("all-day default end remains correct across the fall DST boundary", () => {
  const output = params({ title: "All day", start: new Date("2026-11-01T04:00:00Z"), isAllDay: true });
  assert.equal(output.get("dates"), "20261101/20261102");
});

test("calendar URLs default missing or invalid timed ends to one hour", () => {
  const start = new Date("2026-08-19T12:30:00Z");
  assert.equal(params({ title: "No end", start }).get("dates"), "20260819T123000Z/20260819T133000Z");
  assert.equal(params({ title: "Bad end", start, end: new Date("2026-08-19T12:00:00Z") }).get("dates"), "20260819T123000Z/20260819T133000Z");
});
