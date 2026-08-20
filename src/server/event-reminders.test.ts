import assert from "node:assert/strict";
import test from "node:test";
import { reminderWindow } from "./event-reminders";

test("event reminder window targets roughly one day ahead", () => {
  const now = new Date("2026-08-14T12:00:00.000Z");
  const window = reminderWindow(now);
  assert.equal(window.start.toISOString(), "2026-08-15T06:00:00.000Z");
  assert.equal(window.end.toISOString(), "2026-08-15T18:00:00.000Z");
});
