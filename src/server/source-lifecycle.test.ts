import assert from "node:assert/strict";
import test from "node:test";

import { RETIRED_SOURCE_NOTE_MARKER } from "@/server/scrape-health";
import {
  pauseSource,
  restoreSource,
  retireSource,
  summarizeSourceRemovalImpact,
} from "@/server/source-lifecycle";

test("pause deactivates a source without changing its notes", () => {
  const notes = "Check the parks calendar every Friday.\nPreserve this formatting.";

  assert.deepEqual(pauseSource({ active: true, notes }), {
    active: false,
    notes,
  });
  assert.deepEqual(pauseSource({ active: true, notes: null }), {
    active: false,
    notes: null,
  });
});

test("retire adds one canonical marker and is idempotent", () => {
  const once = retireSource({ active: true, notes: "Manual follow-up required." });
  const twice = retireSource(once);

  assert.deepEqual(once, {
    active: false,
    notes: `${RETIRED_SOURCE_NOTE_MARKER} Manual follow-up required.`,
  });
  assert.deepEqual(twice, once);
  assert.equal(
    twice.notes?.match(new RegExp(`\\${RETIRED_SOURCE_NOTE_MARKER}`, "g"))?.length,
    1,
  );
});

test("retire normalizes duplicate and case-variant legacy markers", () => {
  assert.deepEqual(
    retireSource({
      active: false,
      notes: "[RETIRED] First note [retired] second note",
    }),
    {
      active: false,
      notes: `${RETIRED_SOURCE_NOTE_MARKER} First note second note`,
    },
  );
});

test("restore removes retirement markers while preserving other notes", () => {
  assert.deepEqual(
    restoreSource({
      active: false,
      notes: "[RETIRED] Keep this note.\n[retired] And this one.",
    }),
    {
      active: true,
      notes: "Keep this note.\nAnd this one.",
    },
  );
  assert.deepEqual(restoreSource({ active: false, notes: "[RETIRED]" }), {
    active: true,
    notes: null,
  });
});

test("removal impact summarizes all source-owned content", () => {
  assert.deepEqual(
    summarizeSourceRemovalImpact({
      events: 3,
      meetings: 2,
      alerts: 1,
      volunteerOpportunities: 4,
    }),
    {
      events: 3,
      meetings: 2,
      alerts: 1,
      volunteerOpportunities: 4,
      totalOwnedContent: 10,
      hasOwnedContent: true,
      warning:
        "This source owns 10 public records. Retire it instead of permanently deleting it unless those records are handled first.",
    },
  );
});

test("removal impact permits safe empty-source removal and rejects invalid counts", () => {
  const empty = summarizeSourceRemovalImpact({
    events: 0,
    meetings: 0,
    alerts: 0,
    volunteerOpportunities: 0,
  });

  assert.equal(empty.totalOwnedContent, 0);
  assert.equal(empty.hasOwnedContent, false);
  assert.equal(empty.warning, null);
  assert.throws(
    () =>
      summarizeSourceRemovalImpact({
        events: -1,
        meetings: 0,
        alerts: 0,
        volunteerOpportunities: 0,
      }),
    /non-negative integer/,
  );
});
