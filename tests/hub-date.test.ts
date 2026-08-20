import assert from "node:assert/strict";
import test from "node:test";

import {
  getCommunityDateKey,
  getCommunityWeekendRange,
  parseCommunityDateTime,
} from "../src/lib/hub-date";
import {
  createCalendarUrl,
  formatDateTimeRange,
  formatFriendlyDate,
  parseStoredList,
} from "../src/lib/hub-format";

test("parses winter datetime-local values as Eastern Standard Time", () => {
  assert.equal(
    parseCommunityDateTime("2026-01-15T08:00").toISOString(),
    "2026-01-15T13:00:00.000Z",
  );
});

test("parses summer datetime-local values as Eastern Daylight Time", () => {
  assert.equal(
    parseCommunityDateTime("2026-07-15T08:00").toISOString(),
    "2026-07-15T12:00:00.000Z",
  );
});

test("formats event ranges in Eastern time regardless of server timezone", () => {
  assert.equal(
    formatDateTimeRange(
      new Date("2026-07-15T12:00:00Z"),
      new Date("2026-07-15T16:00:00Z"),
    ),
    "Wed, Jul 15, 8:00 AM - 12:00 PM",
  );
});

test("formats missing, equal, or backwards end times as a start time", () => {
  const start = new Date("2026-07-15T12:00:00Z");
  const expected = "Wed, Jul 15 at 8:00 AM";
  assert.equal(formatDateTimeRange(start, null), expected);
  assert.equal(formatDateTimeRange(start, new Date(start)), expected);
  assert.equal(formatDateTimeRange(start, new Date("2026-07-15T11:00:00Z")), expected);
});

test("friendly dates compare calendar days in Eastern time", () => {
  const now = new Date("2026-07-31T03:30:00Z");
  assert.equal(getCommunityDateKey(now), "2026-07-30");
  assert.equal(
    formatFriendlyDate(new Date("2026-07-31T13:00:00Z"), false, now),
    "Tomorrow, 9:00 AM",
  );
});

test("weekend boundaries run from Friday through Thursday in Eastern time", () => {
  const range = getCommunityWeekendRange(new Date("2026-07-31T16:00:00Z"));
  assert.equal(range.start.toISOString(), "2026-07-31T04:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-08-07T03:59:59.999Z");
});

test("calendar URLs carry explicit UTC instants", () => {
  const url = createCalendarUrl({
    title: "Farmers Market",
    start: new Date("2026-07-15T12:00:00Z"),
    end: new Date("2026-07-15T16:00:00Z"),
  });
  const dates = new URL(url).searchParams.get("dates");
  assert.equal(dates, "20260715T120000Z/20260715T160000Z");
});

test("calendar URLs use a one-hour duration for missing or non-positive ends", () => {
  const start = new Date("2026-07-15T12:00:00Z");
  for (const end of [undefined, new Date(start), new Date("2026-07-15T11:00:00Z")]) {
    const url = createCalendarUrl({ title: "Farmers Market", start, end });
    assert.equal(
      new URL(url).searchParams.get("dates"),
      "20260715T120000Z/20260715T130000Z",
    );
  }
});

test("stored tag lists are trimmed and deduplicated case-insensitively", () => {
  assert.deepEqual(
    parseStoredList('[" Free ", "free", "Kid   friendly", ""]'),
    ["Free", "Kid friendly"],
  );
  assert.deepEqual(parseStoredList("Music, music, Outdoors"), ["Music", "Outdoors"]);
});
