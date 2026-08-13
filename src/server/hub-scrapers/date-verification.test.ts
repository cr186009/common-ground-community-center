import assert from "node:assert/strict";
import test from "node:test";
import { Category } from "@prisma/client";
import { verifyEventDate, verifyEventDateTime } from "./date-verification";

function event(overrides: Record<string, unknown> = {}) {
  return { title: "Community picnic", description: null, startDateTime: new Date("2026-08-15T14:00:00Z"), city: "Dallas", county: "Paulding", category: Category.FAMILY, sourceName: "Test", sourceUrl: "https://example.com", ...overrides } as Parameters<typeof verifyEventDate>[0];
}

test("verifies matching title date", () => assert.equal(verifyEventDate(event({ title: "Community picnic August 15, 2026" })).status, "VERIFIED"));
test("holds a conflicting description date", () => assert.equal(verifyEventDate(event({ description: "Join us August 16, 2026." })).status, "CONFLICT"));
test("ignores registration deadlines when the event date matches", () => assert.equal(verifyEventDate(event({ description: "Register August 12 for the event August 15, 2026." })).status, "VERIFIED"));
test("detects weekday/date mismatch", () => {
  const result = verifyEventDate(event({ title: "Picnic Sunday, August 15, 2026" }));
  assert.equal(result.status, "CONFLICT");
  assert.match(result.reason ?? "", /Weekday/);
});
test("holds events with no independent evidence", () => assert.equal(verifyEventDate(event()).status, "MISSING_EVIDENCE"));
test("accepts matching structured evidence", () => assert.equal(verifyEventDate(event({ dateEvidence: { structuredDate: "2026-08-15" } })).status, "VERIFIED"));
test("compares the stored instant using the community calendar date", () => {
  const result = verifyEventDate(event({
    startDateTime: new Date("2026-08-16T02:00:00Z"),
    dateEvidence: { structuredDate: "2026-08-15" },
  }));
  assert.equal(result.status, "VERIFIED");
});
test("holds cancelled events even when the date matches", () => {
  const result = verifyEventDate(event({
    title: "Community picnic August 15, 2026 — CANCELLED",
  }));
  assert.equal(result.status, "CONFLICT");
  assert.match(result.reason ?? "", /cancelled/i);
  assert.ok(result.evidence.some((item) => item.kind === "status"));
});
test("holds postponed events mentioned in descriptions", () => {
  const result = verifyEventDate(event({
    description: "This event has been postponed. A new date will be announced.",
  }));
  assert.equal(result.status, "CONFLICT");
  assert.match(result.reason ?? "", /postponed/i);
});
test("holds rescheduled events found in retained source text", () => {
  const result = verifyEventDate(event({
    dateEvidence: {
      structuredDate: "2026-08-15",
      sourcePublishedText: "Rescheduled due to weather.",
    },
  }));
  assert.equal(result.status, "CONFLICT");
  assert.match(result.reason ?? "", /rescheduled/i);
});

test("verifies an occurrence that fits a recurring weekday range", () => {
  const result = verifyEventDate(event({
    startDateTime: new Date("2026-08-13T22:00:00Z"),
    description: "Every Thursday, May 7 through August 27, 2026 at 6 PM",
  }));
  assert.equal(result.status, "VERIFIED");
});

test("verifies a date listed under a month heading", () => {
  const result = verifyEventDate(event({ description: "August 11, 15, 25, 2026" }));
  assert.equal(result.status, "VERIFIED");
});

test("uses an occurrence date embedded in the original URL", () => {
  const result = verifyEventDate(event({ originalUrl: "https://example.com/events/2026/08/15/picnic" }));
  assert.equal(result.status, "VERIFIED");
});

test("verifies an occurrence within a multi-day date range", () => {
  const result = verifyEventDate(event({
    startDateTime: new Date("2026-08-22T13:00:00Z"),
    description: "The census takes place August 21–22, 2026.",
  }));
  assert.equal(result.status, "VERIFIED");
});

test("ignores an incidental album release date", () => {
  const result = verifyEventDate(event({
    originalUrl: "https://example.com/events/2026/08/15/show",
    description: "Their new album arrives October 3, 2026.",
  }));
  assert.equal(result.status, "VERIFIED");
  assert.ok(!result.evidence.some((item) => item.value === "2026-10-03"));
});

test("a matching occurrence URL outranks an unrelated weekday typo in a long schedule", () => {
  const result = verifyEventDate(event({
    originalUrl: "https://example.com/toddler-tuesday/2026-08-15/",
    description: "Schedule: January 1, February 2, and Tuesday November 11.",
  }));
  assert.equal(result.status, "VERIFIED");
  assert.doesNotMatch(result.reason ?? "", /Weekday/);
});

test("verifies time independently in Eastern daylight time", () => {
  const result = verifyEventDateTime(event({
    startDateTime: new Date("2026-08-15T22:00:00Z"),
    description: "August 15, 2026 from 6:00–8:00 PM",
  }));
  assert.equal(result.date.status, "VERIFIED");
  assert.equal(result.time.status, "VERIFIED");
});

test("marks a missing time independently from a verified date", () => {
  const result = verifyEventDateTime(event({ title: "Community picnic August 15, 2026" }));
  assert.equal(result.date.status, "VERIFIED");
  assert.equal(result.time.status, "MISSING_EVIDENCE");
});

test("detects a source time conflict independently", () => {
  const result = verifyEventDateTime(event({
    startDateTime: new Date("2026-08-15T23:00:00Z"),
    description: "August 15, 2026 at 6 PM",
  }));
  assert.equal(result.date.status, "VERIFIED");
  assert.equal(result.time.status, "CONFLICT");
});

test("ignores a registration seat-sales deadline time", () => {
  const result = verifyEventDateTime(event({
    startDateTime: new Date("2026-08-15T23:00:00Z"),
    description: "August 15, 2026. Registration and seat sales remain open until 5:00 p.m.",
  }));
  assert.equal(result.date.status, "VERIFIED");
  assert.equal(result.time.status, "MISSING_EVIDENCE");
});

test("structured timestamps verify both date and time", () => {
  const result = verifyEventDateTime(event({
    startDateTime: new Date("2026-12-15T23:30:00Z"),
    dateEvidence: { structuredDate: "2026-12-15T18:30:00-05:00" },
  }));
  assert.equal(result.date.status, "VERIFIED");
  assert.equal(result.time.status, "VERIFIED");
});
