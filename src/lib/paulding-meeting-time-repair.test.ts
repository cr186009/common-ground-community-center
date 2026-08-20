import assert from "node:assert/strict";
import test from "node:test";

import { planPauldingMeetingTimeRepair } from "./paulding-meeting-time-repair";

const cutoff = new Date("2026-08-20T00:00:00Z");
const url = (day: number) => `https://www.paulding.gov/Calendar.aspx?EID=2015&month=8&year=2026&day=${day}&calType=0`;

test("removes a stale shifted row when the corrected CivicPlus occurrence exists", () => {
  const actions = planPauldingMeetingTimeRepair([
    { id: "old", title: "Work Session", startDateTime: new Date("2026-08-25T10:00:00Z"), endDateTime: new Date("2026-08-25T11:00:00Z"), originalUrl: url(13), lastSeenAt: new Date("2026-08-13T20:00:00Z") },
    { id: "new", title: "Work Session", startDateTime: new Date("2026-08-25T14:00:00Z"), endDateTime: new Date("2026-08-25T15:00:00Z"), originalUrl: url(20), lastSeenAt: new Date("2026-08-20T19:00:00Z") },
  ], cutoff);
  assert.deepEqual(actions, [{ action: "delete-duplicate", id: "old", retainedId: "new" }]);
});

test("corrects an unmatched stale winter row using the Eastern standard-time offset", () => {
  const [action] = planPauldingMeetingTimeRepair([
    { id: "old", title: "WSAB Meeting", startDateTime: new Date("2026-11-18T08:30:00Z"), endDateTime: new Date("2026-11-18T10:00:00Z"), originalUrl: "https://www.paulding.gov/Calendar.aspx?EID=1840&day=13", lastSeenAt: new Date("2026-08-13T20:00:00Z") },
  ], cutoff);
  assert.equal(action.action, "correct-time");
  if (action.action === "correct-time") {
    assert.equal(action.startDateTime.toISOString(), "2026-11-18T13:30:00.000Z");
    assert.equal(action.endDateTime?.toISOString(), "2026-11-18T15:00:00.000Z");
  }
});

test("does not shift an already repaired row a second time", () => {
  const actions = planPauldingMeetingTimeRepair([
    { id: "repaired", title: "WSAB Meeting", startDateTime: new Date("2026-11-18T13:30:00Z"), endDateTime: new Date("2026-11-18T15:00:00Z"), originalUrl: "https://www.paulding.gov/Calendar.aspx?EID=1840&day=13", lastSeenAt: new Date("2026-08-13T20:00:00Z") },
  ], cutoff);
  assert.deepEqual(actions, []);
});
