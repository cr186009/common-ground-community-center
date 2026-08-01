import assert from "node:assert/strict";
import test from "node:test";

import { parseAcworthDate } from "./acworth-official";

test("treats an Acworth date-only value as an Eastern civil date", () => {
  const parsed = parseAcworthDate("2026-08-03");

  assert.equal(parsed?.date.toISOString(), "2026-08-03T04:00:00.000Z");
  assert.equal(parsed?.isAllDay, true);
});

test("preserves an explicitly offset Eastern timestamp", () => {
  const parsed = parseAcworthDate("2026-08-03T12:00:00-04:00");

  assert.equal(parsed?.date.toISOString(), "2026-08-03T16:00:00.000Z");
  assert.equal(parsed?.isAllDay, false);
});

test("preserves a UTC timestamp for Eastern display conversion", () => {
  const parsed = parseAcworthDate("2026-08-03T16:00:00Z");

  assert.equal(parsed?.date.toISOString(), "2026-08-03T16:00:00.000Z");
  assert.equal(parsed?.isAllDay, false);
});

test("interprets an offset-free date-time as Eastern civil time", () => {
  const parsed = parseAcworthDate("2026-08-03T12:00:00");

  assert.equal(parsed?.date.toISOString(), "2026-08-03T16:00:00.000Z");
  assert.equal(parsed?.isAllDay, false);
});

test("rejects invalid and ambiguous date strings", () => {
  assert.equal(parseAcworthDate("2026-02-30"), null);
  assert.equal(parseAcworthDate("August 3, 2026"), null);
});
