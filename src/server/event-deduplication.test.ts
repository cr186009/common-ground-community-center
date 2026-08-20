import assert from "node:assert/strict";
import test from "node:test";

import type { Event } from "@prisma/client";

import {
  buildMergedEventData,
  groupExactDuplicateEvents,
  selectCanonicalEvent,
} from "./event-deduplication";

function event(overrides: Partial<Event> = {}): Event {
  const now = new Date("2026-08-13T12:00:00.000Z");
  return {
    id: "event-a", title: "Summer Concert!", description: null,
    startDateTime: new Date("2026-09-01T23:00:00.000Z"), endDateTime: null,
    locationName: null, address: null, city: "Canton", county: "Cherokee",
    category: "MUSIC", tags: "[]", cost: null, isFree: false, isKidFriendly: false,
    isOutdoor: false, sourceName: "Source A", sourceUrl: "https://example.com",
    originalUrl: null, imageUrl: null, imageSource: null, imageCredit: null,
    imageCreditUrl: null, imageAlt: null, imageIsFallback: false, status: "APPROVED",
    dateVerificationStatus: "MISSING_EVIDENCE", dateVerificationReason: null,
    dateEvidence: "[]", dateVerifiedAt: null, timeVerificationStatus: "MISSING_EVIDENCE",
    timeVerificationReason: null, timeEvidence: "[]", timeVerifiedAt: null,
    sourcePublishedText: null, confidenceScore: null, createdAt: now, updatedAt: now,
    lastSeenAt: now, sourceId: null, isAllDay: false, timeZone: "America/New_York",
    ...overrides,
  };
}

test("exact duplicate grouping requires the exact start timestamp", () => {
  const same = event({ id: "b", title: "summer concert", city: " CANTON " });
  const later = event({ id: "c", startDateTime: new Date("2026-09-02T00:00:00.000Z") });
  const groups = groupExactDuplicateEvents([event(), same, later]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].map((item) => item.id), ["event-a", "b"]);
});

test("records at distinct known venues are never cleanup candidates", () => {
  const groups = groupExactDuplicateEvents([
    event({ id: "one", locationName: "City Hall" }),
    event({ id: "two", locationName: "Downtown Park" }),
  ]);
  assert.equal(groups.length, 0);
});

test("canonical selection prefers verified and richer records", () => {
  const verified = event({ id: "verified", dateVerificationStatus: "VERIFIED", description: "Official description" });
  assert.equal(selectCanonicalEvent([event(), verified]).id, "verified");
});

test("canonical selection prefers source-listed data over disputed evidence", () => {
  const listed = event({ id: "listed", dateVerificationStatus: "SOURCE_LISTED" });
  const ambiguous = event({ id: "ambiguous", dateVerificationStatus: "AMBIGUOUS" });
  assert.equal(selectCanonicalEvent([ambiguous, listed]).id, "listed");
});

test("merge preserves strongest details, flags, evidence, and non-fallback image", () => {
  const weak = event({ id: "weak", isFree: true, dateEvidence: JSON.stringify([{ source: "api" }]), imageUrl: "fallback.jpg", imageIsFallback: true });
  const rich = event({ id: "rich", description: "A much richer official description", dateVerificationStatus: "VERIFIED", dateEvidence: JSON.stringify([{ source: "page" }]), imageUrl: "official.jpg", imageSource: "Official", sourceId: "source-1" });
  const merged = buildMergedEventData([weak, rich]);
  assert.equal(merged.description, rich.description);
  assert.equal(merged.isFree, true);
  assert.equal(merged.imageUrl, "official.jpg");
  assert.equal(merged.dateVerificationStatus, "VERIFIED");
  assert.equal(JSON.parse(merged.dateEvidence as string).length, 2);
  assert.deepEqual(merged.source, { connect: { id: "source-1" } });
});
