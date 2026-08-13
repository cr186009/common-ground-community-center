import assert from "node:assert/strict";
import test from "node:test";

import {
  assessImminence,
  compareAuditPriority,
  needsVerificationReview,
  parseEvidence,
  summarizeVerificationStatuses,
} from "./event-verification-audit-report";

const now = new Date("2026-08-13T12:00:00Z");

test("imminence gives near-term events the highest review priority", () => {
  assert.equal(assessImminence(new Date("2026-08-14T10:00:00Z"), now).priority, "WITHIN_24_HOURS");
  assert.equal(assessImminence(new Date("2026-08-18T12:00:00Z"), now).priority, "WITHIN_7_DAYS");
  assert.equal(assessImminence(new Date("2026-09-01T12:00:00Z"), now).priority, "WITHIN_30_DAYS");
  assert.equal(assessImminence(new Date("2026-08-12T12:00:00Z"), now).priority, "PAST");
});

test("date and time verification totals remain independent", () => {
  assert.deepEqual(summarizeVerificationStatuses([
    { dateVerification: { status: "VERIFIED" }, timeVerification: { status: "MISSING_EVIDENCE" } },
    { dateVerification: { status: "VERIFIED" }, timeVerification: { status: "CONFLICT" } },
  ]), {
    date: { VERIFIED: 2 },
    time: { MISSING_EVIDENCE: 1, CONFLICT: 1 },
  });
});

test("manual and automatic verification do not require review", () => {
  assert.equal(needsVerificationReview("VERIFIED"), false);
  assert.equal(needsVerificationReview("MANUALLY_VERIFIED"), false);
  assert.equal(needsVerificationReview("CONFLICT"), true);
});

test("review ordering puts imminent future events before past records", () => {
  const sorted = [
    { priority: "PAST" as const, startDateTime: new Date("2026-01-01") },
    { priority: "WITHIN_7_DAYS" as const, startDateTime: new Date("2026-08-15") },
    { priority: "WITHIN_24_HOURS" as const, startDateTime: new Date("2026-08-14") },
  ].sort(compareAuditPriority);
  assert.deepEqual(sorted.map((item) => item.priority), ["WITHIN_24_HOURS", "WITHIN_7_DAYS", "PAST"]);
});

test("stored JSON evidence is emitted as structured data", () => {
  assert.deepEqual(parseEvidence('[{"kind":"title"}]'), [{ kind: "title" }]);
  assert.equal(parseEvidence("legacy evidence"), "legacy evidence");
});
