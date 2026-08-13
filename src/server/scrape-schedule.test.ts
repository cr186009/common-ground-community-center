import assert from "node:assert/strict";
import test from "node:test";

import {
  getSourceScheduleDecision,
  revalidationIntervalMs,
  scrapeIntervalMs,
  selectDueSources,
} from "@/server/scrape-schedule";

const hour = 60 * 60 * 1000;
const now = new Date("2026-08-13T12:00:00Z");

test("frequency labels become enforceable intervals", () => {
  assert.equal(scrapeIntervalMs("hourly"), hour);
  assert.equal(scrapeIntervalMs("daily"), 24 * hour);
  assert.equal(scrapeIntervalMs("2 hours"), 2 * hour);
  assert.equal(scrapeIntervalMs("weekly"), 7 * 24 * hour);
  assert.equal(scrapeIntervalMs(null), 24 * hour);
});

test("revalidation cadence tightens at seven days, 48 hours, and 12 hours", () => {
  assert.equal(revalidationIntervalMs(new Date(now.getTime() + 8 * 24 * hour), now), null);
  assert.equal(revalidationIntervalMs(new Date(now.getTime() + 6 * 24 * hour), now), 24 * hour);
  assert.equal(revalidationIntervalMs(new Date(now.getTime() + 47 * hour), now), 12 * hour);
  assert.equal(revalidationIntervalMs(new Date(now.getTime() + 11 * hour), now), 3 * hour);
});

test("a never-attempted source is immediately due", () => {
  const decision = getSourceScheduleDecision({
    id: "one",
    name: "Calendar",
    scrapeFrequency: "daily",
    lastAttemptAt: null,
  }, now);
  assert.equal(decision.due, true);
  assert.equal(decision.reason, "NEVER_ATTEMPTED");
});

test("an upcoming event can make a weekly source due for revalidation", () => {
  const decision = getSourceScheduleDecision({
    id: "one",
    name: "Calendar",
    scrapeFrequency: "weekly",
    lastAttemptAt: new Date(now.getTime() - 13 * hour),
    nextUpcomingEventAt: new Date(now.getTime() + 36 * hour),
  }, now);
  assert.equal(decision.due, true);
  assert.equal(decision.reason, "UPCOMING_EVENT_REVALIDATION");
});

test("due sources are ordered by their oldest due time", () => {
  const due = selectDueSources([
    { id: "newer", name: "Newer", scrapeFrequency: "daily", lastAttemptAt: new Date(now.getTime() - 25 * hour) },
    { id: "older", name: "Older", scrapeFrequency: "daily", lastAttemptAt: new Date(now.getTime() - 30 * hour) },
  ], now);
  assert.deepEqual(due.map(({ source }) => source.id), ["older", "newer"]);
});
