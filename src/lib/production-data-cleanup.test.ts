import assert from "node:assert/strict";
import test from "node:test";

import { classifyDuplicateGroup, classifyInvalidRange } from "./production-data-cleanup";

const start = new Date("2026-09-01T14:00:00.000Z");

test("range cleanup clears only an unverified invalid end", () => {
  assert.equal(classifyInvalidRange({ startDateTime: start, endDateTime: start }).action, "clear-end");
  assert.equal(classifyInvalidRange({ startDateTime: start, endDateTime: null }).action, "none");
});

test("range cleanup holds invalid ends backed by protected evidence", () => {
  const result = classifyInvalidRange({
    startDateTime: start,
    endDateTime: new Date(start.getTime() - 1),
    timeVerificationStatus: "VERIFIED",
  });
  assert.equal(result.action, "hold");
});

function duplicate(overrides: Partial<Parameters<typeof classifyDuplicateGroup>[0][number]> = {}) {
  return {
    category: "MUSIC",
    isAllDay: false,
    endDateTime: new Date("2026-09-01T16:00:00.000Z"),
    dateVerificationStatus: "SOURCE_LISTED",
    timeVerificationStatus: "SOURCE_LISTED",
    ...overrides,
  };
}

test("duplicate cleanup merges only semantically consistent groups", () => {
  assert.equal(classifyDuplicateGroup([duplicate(), duplicate()]).action, "merge");
  assert.equal(classifyDuplicateGroup([duplicate(), duplicate({ category: "FAMILY" })]).action, "hold");
  assert.equal(classifyDuplicateGroup([duplicate(), duplicate({ isAllDay: true })]).action, "hold");
  assert.equal(classifyDuplicateGroup([
    duplicate(),
    duplicate({ endDateTime: new Date("2026-09-01T17:00:00.000Z") }),
  ]).action, "hold");
});

test("duplicate cleanup holds disputed verification evidence", () => {
  assert.equal(classifyDuplicateGroup([
    duplicate(),
    duplicate({ dateVerificationStatus: "CONFLICT" }),
  ]).action, "hold");
});
