import assert from "node:assert/strict";
import test from "node:test";

import {
  alertStatusForExpiration,
  resolveAlertStatus,
} from "@/server/alert-lifecycle";

const NOW = new Date("2026-07-31T16:00:00.000Z");

test("alerts remain visible as expired for 14 days", () => {
  assert.equal(
    alertStatusForExpiration(new Date("2026-07-17T16:00:00.000Z"), NOW),
    "EXPIRED",
  );
});

test("alerts older than 14 days are archived", () => {
  assert.equal(
    alertStatusForExpiration(new Date("2026-07-17T15:59:59.999Z"), NOW),
    "ARCHIVED",
  );
});

test("expiration overrides a stale ACTIVE status from a source", () => {
  assert.equal(
    resolveAlertStatus("ACTIVE", new Date("2026-07-31T15:00:00.000Z"), NOW),
    "EXPIRED",
  );
});
