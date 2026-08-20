import assert from "node:assert/strict";
import test from "node:test";

import type { Event } from "@prisma/client";

import {
  countEventDiscoveryResults,
  groupEventsForDisplay,
} from "./hub-event-grouping";

function event(overrides: Partial<Event> = {}): Event {
  const now = new Date("2026-08-14T12:00:00.000Z");
  return {
    id: "one", title: "Open Play: Basketball", description: null,
    startDateTime: new Date("2026-08-20T22:00:00.000Z"), endDateTime: null,
    locationName: "Community Center", address: "1 Main St", city: "Dallas", county: "Paulding",
    category: "SPORTS", tags: "[]", cost: null, isFree: true, isKidFriendly: false,
    isOutdoor: false, sourceName: "City Calendar", sourceUrl: "https://example.com/calendar",
    originalUrl: null, imageUrl: null, imageSource: null, imageCredit: null,
    imageCreditUrl: null, imageAlt: null, imageIsFallback: false, status: "APPROVED",
    dateVerificationStatus: "VERIFIED", dateVerificationReason: null, dateEvidence: "[]",
    dateVerifiedAt: now, timeVerificationStatus: "VERIFIED", timeVerificationReason: null,
    timeEvidence: "[]", timeVerifiedAt: now, sourcePublishedText: null, confidenceScore: 0.9,
    createdAt: now, updatedAt: now, lastSeenAt: now, sourceId: "source-one",
    isAllDay: false, timeZone: "America/New_York", ...overrides,
  };
}

test("groups recurring dates from the same source and venue", () => {
  const later = event({
    id: "two",
    startDateTime: new Date("2026-08-22T22:00:00.000Z"),
  });
  const [group] = groupEventsForDisplay([later, event()]);

  assert.equal(group.event.id, "one");
  assert.deepEqual(group.additionalOccurrences.map((item) => item.id), ["two"]);
});

test("does not group matching titles at different venues", () => {
  const groups = groupEventsForDisplay([
    event(),
    event({ id: "two", locationName: "Recreation Annex" }),
  ]);

  assert.equal(groups.length, 2);
});

test("collapses duplicate records for the same recurring occurrence", () => {
  const duplicate = event({ id: "duplicate" });
  const later = event({
    id: "later",
    startDateTime: new Date("2026-08-22T22:00:00.000Z"),
  });
  const [group] = groupEventsForDisplay([event(), duplicate, later]);

  assert.equal(group.event.id, "one");
  assert.deepEqual(group.additionalOccurrences.map((item) => item.id), ["later"]);
});

test("distinguishes event series from upcoming date records", () => {
  const events = [
    event(),
    event({ id: "later", startDateTime: new Date("2026-08-22T22:00:00.000Z") }),
    event({ id: "different", title: "Farmers Market" }),
  ];

  assert.deepEqual(countEventDiscoveryResults(events), {
    eventSeries: 2,
    upcomingDates: 3,
  });
});
