import assert from "node:assert/strict";
import test from "node:test";

import {
  getEventEffectiveEnd,
  getEventLifecycleCandidateStart,
  isEventInPublicRange,
} from "@/lib/event-lifecycle";
import { parseCommunityDateTime } from "@/lib/hub-date";

test("a valid end keeps an event current after its start", () => {
  const event = {
    startDateTime: parseCommunityDateTime("2026-08-20T18:00"),
    endDateTime: parseCommunityDateTime("2026-08-20T21:00"),
  };

  assert.equal(
    isEventInPublicRange(event, parseCommunityDateTime("2026-08-20T20:00")),
    true,
  );
  assert.equal(
    isEventInPublicRange(event, parseCommunityDateTime("2026-08-20T21:01")),
    false,
  );
});

test("a timed event without a valid end uses the documented three-hour fallback", () => {
  const startDateTime = parseCommunityDateTime("2026-08-20T18:00");

  assert.equal(
    getEventEffectiveEnd({ startDateTime, endDateTime: null }).toISOString(),
    parseCommunityDateTime("2026-08-20T21:00").toISOString(),
  );
  assert.equal(
    getEventEffectiveEnd({
      startDateTime,
      endDateTime: parseCommunityDateTime("2026-08-20T17:00"),
    }).toISOString(),
    parseCommunityDateTime("2026-08-20T21:00").toISOString(),
  );
});

test("an all-day event without a valid end remains current through its community day", () => {
  const event = {
    startDateTime: parseCommunityDateTime("2026-08-20T00:00"),
    endDateTime: null,
    isAllDay: true,
  };

  assert.equal(
    isEventInPublicRange(event, parseCommunityDateTime("2026-08-20T23:30")),
    true,
  );
  assert.equal(
    isEventInPublicRange(event, parseCommunityDateTime("2026-08-21T00:00")),
    false,
  );
});

test("range overlap includes ongoing multi-day events and excludes later starts", () => {
  const event = {
    startDateTime: parseCommunityDateTime("2026-08-19T09:00"),
    endDateTime: parseCommunityDateTime("2026-08-22T17:00"),
  };

  assert.equal(
    isEventInPublicRange(
      event,
      parseCommunityDateTime("2026-08-20T00:00"),
      parseCommunityDateTime("2026-08-20T23:59"),
    ),
    true,
  );
  assert.equal(
    isEventInPublicRange(
      { ...event, startDateTime: parseCommunityDateTime("2026-08-21T09:00") },
      parseCommunityDateTime("2026-08-20T00:00"),
      parseCommunityDateTime("2026-08-20T23:59"),
    ),
    false,
  );
});

test("candidate cutoff covers timed events crossing midnight", () => {
  assert.equal(
    getEventLifecycleCandidateStart(
      parseCommunityDateTime("2026-08-21T01:00"),
    ).toISOString(),
    parseCommunityDateTime("2026-08-20T22:00").toISOString(),
  );
});
