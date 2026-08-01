import assert from "node:assert/strict";
import test from "node:test";

import { classifyPreviewItem, type PreviewComparableItem } from "./preview-classification";

const base: PreviewComparableItem = {
  kind: "event",
  title: "Summer Concert",
  date: new Date("2026-08-03T22:00:00Z"),
  endDate: null,
  city: "Dallas",
  county: "Paulding",
  sourceName: "Dallas Events",
  sourceUrl: "https://example.com/events/1",
  sourcePageUrl: "https://example.com/events",
};

test("classifies new, existing, changed, and cross-source duplicate items", () => {
  assert.equal(classifyPreviewItem(base, []).decision, "NEW");
  const existing = { ...base };
  assert.equal(classifyPreviewItem(base, [existing]).decision, "EXISTING");
  assert.equal(
    classifyPreviewItem({ ...base, endDate: new Date("2026-08-04T00:00:00Z") }, [existing]).decision,
    "CHANGED",
  );
  assert.equal(
    classifyPreviewItem(base, [{ ...existing, sourceName: "County Calendar" }]).decision,
    "DUPLICATE",
  );
});

test("classifies invalid and known out-of-area records before database matching", () => {
  assert.equal(
    classifyPreviewItem({ ...base, valid: false, validationError: "Bad date" }, []).decision,
    "INVALID",
  );
  assert.equal(
    classifyPreviewItem({ ...base, city: "Adairsville", county: "Bartow" }, []).decision,
    "OUT_OF_AREA",
  );
});

test("stable source URLs identify changed dates without confusing generic calendars", () => {
  const prior = { ...base, date: new Date("2026-08-02T22:00:00Z") };
  assert.equal(classifyPreviewItem(base, [prior]).decision, "CHANGED");
  assert.equal(
    classifyPreviewItem({ ...base, sourceUrl: base.sourcePageUrl }, [{ ...prior, sourceUrl: base.sourcePageUrl }]).decision,
    "NEW",
  );
});
