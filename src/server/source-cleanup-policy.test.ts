import assert from "node:assert/strict";
import test from "node:test";

import { planSourceCleanup, type CleanupSource } from "./source-cleanup-policy";

function source(overrides: Partial<CleanupSource> & Pick<CleanupSource, "id" | "name">): CleanupSource {
  return {
    active: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    counts: { alerts: 0, events: 0, meetings: 0, logs: 0, volunteer: 0 },
    ...overrides,
  };
}

test("deletes only unused unmanaged discovery sources", () => {
  const [action] = planSourceCleanup([source({ id: "unused", name: "Unverified calendar lead" })]);
  assert.equal(action.action, "delete");
});

test("retires unmanaged sources with content and deletes empty sources with history", () => {
  const actions = planSourceCleanup([
    source({ id: "content", name: "Legacy calendar", counts: { alerts: 0, events: 1, meetings: 0, logs: 0, volunteer: 0 } }),
    source({ id: "history", name: "Old scraper", counts: { alerts: 0, events: 0, meetings: 0, logs: 2, volunteer: 0 } }),
  ]);
  assert.deepEqual(actions.map((action) => action.action), ["retire", "delete"]);
});

test("keeps managed sources and canonicalizes case variants", () => {
  const [action] = planSourceCleanup([
    source({ id: "nws", name: "national weather service alerts" }),
  ]);
  assert.equal(action.action, "keep");
  assert.equal(action.action === "keep" ? action.canonicalName : null, "National Weather Service alerts");
});

test("merges spacing duplicates into the canonical managed source", () => {
  const actions = planSourceCleanup([
    source({ id: "canonical", name: "Paulding County Public Calendar" }),
    source({ id: "duplicate", name: "  paulding   county public calendar ", counts: { alerts: 0, events: 3, meetings: 0, logs: 1, volunteer: 0 } }),
  ]);
  const merge = actions.find((action) => action.action === "merge");
  assert.deepEqual(merge && { sourceId: merge.sourceId, targetId: merge.targetId }, {
    sourceId: "duplicate",
    targetId: "canonical",
  });
});

test("keeps an active populated duplicate and canonicalizes it after merging an inactive shell", () => {
  const actions = planSourceCleanup([
    source({ id: "inactive-canonical", name: "Paulding County Public Calendar", active: false }),
    source({
      id: "active-source",
      name: "Paulding County public calendar",
      active: true,
      counts: { alerts: 0, events: 42, meetings: 3, logs: 8, volunteer: 0 },
    }),
  ]);
  const merge = actions.find((action) => action.action === "merge");
  const keep = actions.find((action) => action.action === "keep");
  assert.deepEqual(merge && { sourceId: merge.sourceId, targetId: merge.targetId }, {
    sourceId: "inactive-canonical",
    targetId: "active-source",
  });
  assert.equal(keep?.sourceId, "active-source");
  assert.equal(keep?.action === "keep" ? keep.canonicalName : null, "Paulding County Public Calendar");
});

test("always retires the held Cedartown integration", () => {
  const [action] = planSourceCleanup([
    source({ id: "cedartown", name: "Downtown Cedartown events page" }),
  ]);
  assert.equal(action.action, "retire");
});
