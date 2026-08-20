import assert from "node:assert/strict";
import test from "node:test";

import { parseHiramDate } from "./hiram-official";

test("parses Hiram date-only and offset-free values as Eastern civil time", () => {
  assert.equal(parseHiramDate("2026-09-07")?.toISOString(), "2026-09-07T04:00:00.000Z");
  assert.equal(parseHiramDate("2026-08-19T08:30:00")?.toISOString(), "2026-08-19T12:30:00.000Z");
});

test("preserves explicit offsets from Hiram", () => {
  assert.equal(parseHiramDate("2026-08-19T08:30:00-04:00")?.toISOString(), "2026-08-19T12:30:00.000Z");
});
