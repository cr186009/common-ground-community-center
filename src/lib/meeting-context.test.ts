import assert from "node:assert/strict";
import test from "node:test";

import { getMeetingContext, getMeetingWhyItMatters } from "./meeting-context";

const base = {
  governmentBody: "Canton City Council",
  meetingType: "CITY_COUNCIL" as const,
  plainEnglishSummary: null,
  summary: null,
  whyResidentsCare: null,
};

test("meeting context preserves parsed official descriptions", () => {
  assert.equal(getMeetingContext({ ...base, summary: "Council will review the downtown plan." }), "Council will review the downtown plan.");
});

test("meeting context gives useful links guidance when source details are sparse", () => {
  assert.match(getMeetingContext(base), /official source/i);
  assert.match(getMeetingWhyItMatters(base), /community decisions/i);
});
