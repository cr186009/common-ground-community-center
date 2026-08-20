import assert from "node:assert/strict";
import test from "node:test";

import { classifyLegacyEventTrust, type LegacyEventTrustInput } from "./event-trust-backfill";

function event(overrides: Partial<LegacyEventTrustInput> = {}): LegacyEventTrustInput {
  return {
    title: "Community concert",
    description: "Saturday evening",
    sourcePublishedText: null,
    sourceName: "Official calendar",
    sourceUrl: "https://example.gov/calendar",
    originalUrl: "https://example.gov/calendar/42",
    startDateTime: new Date("2026-09-12T23:00:00.000Z"),
    endDateTime: new Date("2026-09-13T01:00:00.000Z"),
    timeZone: "America/New_York",
    dateVerificationStatus: "MISSING_EVIDENCE",
    timeVerificationStatus: "MISSING_EVIDENCE",
    ...overrides,
  };
}

test("accepts a valid source-listed legacy schedule", () => {
  assert.deepEqual(classifyLegacyEventTrust(event()), {
    eligible: true,
    reasons: [],
    updateDate: true,
    updateTime: true,
  });
});

test("does not downgrade records that already have a stronger decision", () => {
  const result = classifyLegacyEventTrust(event({
    dateVerificationStatus: "VERIFIED",
    timeVerificationStatus: "MANUALLY_VERIFIED",
  }));
  assert.equal(result.eligible, false);
  assert.match(result.reasons[0], /No missing-evidence/);
});

test("holds malformed ranges and changed listings for review", () => {
  const result = classifyLegacyEventTrust(event({
    title: "Community concert postponed",
    endDateTime: new Date("2026-09-12T22:00:00.000Z"),
  }));
  assert.equal(result.eligible, false);
  assert.equal(result.reasons.length, 2);
});
