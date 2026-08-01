import assert from "node:assert/strict";
import test from "node:test";

import { parsePolkCountyCalendarJson } from "./polk-county-official";

const source = {
  name: "Polk County official calendar",
  url: "https://www.polkga.org/calendar.php",
};

test("separates official county meetings from community events", () => {
  const input = JSON.stringify([
    {
      rid: "52", title: "Finance Committee Meeting",
      start: "2026-08-20T16:00:00", end: "2026-08-20T18:00:00",
      location: "216 Main Street, Cedartown, Georgia 30125",
      desc: "Review%20the%20county%20budget.",
    },
    {
      rid: "60", title: "Homeschool Play Day",
      start: "2026-08-25T10:00:00", end: "2026-08-25T12:00:00",
      location: "73 Clines Ingram Jackson Rd, Cedartown, GA 30125",
      desc: "Free%20activities%20for%20children%20and%20families.",
    },
  ]);
  const output = parsePolkCountyCalendarJson(input, source, new Date("2026-08-01T12:00:00Z"));

  assert.equal(output.meetings?.length, 1);
  assert.equal(output.meetings?.[0].governmentBody, "Polk County Government");
  assert.equal(output.meetings?.[0].startDateTime.toISOString(), "2026-08-20T20:00:00.000Z");
  assert.equal(output.meetings?.[0].summary, "Review the county budget.");
  assert.equal(output.events?.length, 1);
  assert.equal(output.events?.[0].city, "Cedartown");
  assert.equal(output.events?.[0].isFree, true);
  assert.equal(output.events?.[0].isKidFriendly, true);
  assert.equal(output.events?.[0].timeZone, "America/New_York");
});

test("expands current monthly commission meetings and honors exceptions", () => {
  const input = JSON.stringify([{
    rid: "27", title: "Board of Commissioners Meeting",
    start: "2025-08-05T17:15:00", end: "2025-08-05T19:00:00",
    location: "73 Clines Ingram Jackson Rd, Cedartown, GA 30125",
    rrule: "DTSTART:20250805T171500\nRRULE:FREQ=MONTHLY;INTERVAL=1;BYSETPOS=1;BYDAY=TU\nEXDATE:20260901T171500",
  }]);
  const output = parsePolkCountyCalendarJson(input, source, new Date("2026-08-01T12:00:00Z"));
  const dates = output.meetings?.map((meeting) => meeting.startDateTime.toISOString()) ?? [];

  assert.ok(dates.includes("2026-08-04T21:15:00.000Z"));
  assert.ok(!dates.includes("2026-09-01T21:15:00.000Z"));
  assert.ok(dates.includes("2026-10-06T21:15:00.000Z"));
  assert.equal(output.meetings?.[0].meetingType, "COUNTY_COMMISSION");
  assert.equal(output.meetings?.[0].governmentBody, "Polk County Board of Commissioners");
});

test("filters closure notices, stale records, and malformed feed entries", () => {
  const input = JSON.stringify([
    { rid: "54", title: "Admin Offices Closed - Labor Day", start: "2026-09-07T00:00:00", allDay: true },
    { rid: "old", title: "Touch-A-Truck", start: "2025-09-20T09:00:00" },
    { rid: "bad", title: "Broken", start: "not-a-date" },
  ]);
  const output = parsePolkCountyCalendarJson(input, source, new Date("2026-08-01T12:00:00Z"));
  assert.deepEqual(output.events, []);
  assert.deepEqual(output.meetings, []);
});

test("rejects a non-array county response", () => {
  assert.throws(
    () => parsePolkCountyCalendarJson("{}", source),
    /feed was not an array/,
  );
});
