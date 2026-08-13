import assert from "node:assert/strict";
import test from "node:test";
import { Category } from "@prisma/client";
import { verifyEventDate } from "./date-verification";

function event(overrides: Record<string, unknown> = {}) {
  return { title: "Community picnic", description: null, startDateTime: new Date("2026-08-15T14:00:00Z"), city: "Dallas", county: "Paulding", category: Category.FAMILY, sourceName: "Test", sourceUrl: "https://example.com", ...overrides } as Parameters<typeof verifyEventDate>[0];
}

test("verifies matching title date", () => assert.equal(verifyEventDate(event({ title: "Community picnic August 15, 2026" })).status, "VERIFIED"));
test("holds a conflicting description date", () => assert.equal(verifyEventDate(event({ description: "Join us August 16, 2026." })).status, "CONFLICT"));
test("holds multiple source dates as ambiguous", () => assert.equal(verifyEventDate(event({ description: "Register August 12 for the event August 15, 2026." })).status, "AMBIGUOUS"));
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
