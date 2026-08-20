import assert from "node:assert/strict";
import test from "node:test";

import { summarizeCatalogFreshness } from "@/server/catalog-freshness";

const now = new Date("2026-08-20T16:00:00.000Z");

test("catalog freshness uses the oldest relevant healthy source", () => {
  const result = summarizeCatalogFreshness([
    { scrapeFrequency: "DAILY", lastSuccessfulAt: new Date("2026-08-20T14:00:00.000Z") },
    { scrapeFrequency: "DAILY", lastSuccessfulAt: new Date("2026-08-20T10:00:00.000Z") },
  ], now);
  assert.equal(result.status, "CURRENT");
  assert.equal(result.asOf?.toISOString(), "2026-08-20T10:00:00.000Z");
});

test("one overdue or never-successful relevant source suppresses public freshness", () => {
  assert.deepEqual(summarizeCatalogFreshness([
    { scrapeFrequency: "HOURLY", lastSuccessfulAt: new Date("2026-08-20T10:00:00.000Z") },
    { scrapeFrequency: "DAILY", lastSuccessfulAt: null },
  ], now), {
    status: "STALE",
    asOf: null,
    relevantSourceCount: 2,
    overdueSourceCount: 2,
  });
});

test("a catalog without relevant automated sources reports unknown", () => {
  assert.equal(summarizeCatalogFreshness([], now).status, "UNKNOWN");
});
