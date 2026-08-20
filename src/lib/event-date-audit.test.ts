import assert from "node:assert/strict";
import test from "node:test";
import { auditEventDate, extractDateEvidence } from "./event-date-audit";

test("extracts named and numeric dates", () => {
  assert.deepEqual(
    extractDateEvidence("Saturday, August 15, 2026 and 8/16/26", "description", 2026).map((item) => item.date),
    ["2026-08-15", "2026-08-16"],
  );
});

test("reports a text/stored date conflict", () => {
  const result = auditEventDate({
    title: "Community picnic August 15, 2026",
    description: "Join us downtown.",
    startDateTime: new Date("2026-08-16T14:00:00.000Z"),
  });
  assert.equal(result.status, "CONFLICT");
  assert.equal(result.storedDate, "2026-08-16");
});

test("uses the event timezone when comparing dates", () => {
  const result = auditEventDate({
    title: "Late gathering August 15, 2026",
    startDateTime: new Date("2026-08-16T02:00:00.000Z"),
    timeZone: "America/New_York",
  });
  assert.equal(result.status, "MATCH");
});
