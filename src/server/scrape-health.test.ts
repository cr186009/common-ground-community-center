import assert from "node:assert/strict";
import test from "node:test";

import {
  assessSourceHealth,
  finalizeScrapeOutcome,
  isRetiredSource,
  summarizeSourceRuns,
} from "@/server/scrape-health";

const now = new Date("2026-08-01T12:00:00Z");
const latest = new Date("2026-08-01T11:00:00Z");

test("a zero-result event scrape is immediately visible as a warning", () => {
  const result = assessSourceHealth({
    active: true,
    lastScrapedAt: latest,
    scrapeFrequency: "daily",
    hasAutomatedScraper: true,
    sourceSection: "EVENTS",
    recentLogs: [{ status: "PARTIAL", itemsFound: 0, itemsCreated: 0, itemsUpdated: 0 }],
    publishedContentCount: 0,
    now,
  });

  assert.equal(result.status, "DEGRADED");
  assert.match(result.warning ?? "", /found no items/i);
});

test("an empty alert feed remains healthy", () => {
  const result = assessSourceHealth({
    active: true,
    lastScrapedAt: latest,
    scrapeFrequency: "hourly",
    hasAutomatedScraper: true,
    sourceSection: "ALERTS",
    recentLogs: [{ status: "SUCCESS", itemsFound: 0, itemsCreated: 0, itemsUpdated: 0 }],
    publishedContentCount: 0,
    now,
  });

  assert.equal(result.status, "HEALTHY");
});

test("saved content with nothing published is a warning", () => {
  const result = assessSourceHealth({
    active: true,
    lastScrapedAt: latest,
    scrapeFrequency: "daily",
    hasAutomatedScraper: true,
    sourceSection: "EVENTS",
    recentLogs: [{ status: "SUCCESS", itemsFound: 3, itemsCreated: 3, itemsUpdated: 0 }],
    publishedContentCount: 0,
    now,
  });

  assert.equal(result.status, "DEGRADED");
  assert.match(result.warning ?? "", /no published content/i);
});

test("a source that routes results to another content section is not falsely degraded", () => {
  const result = assessSourceHealth({
    active: true,
    lastScrapedAt: latest,
    scrapeFrequency: "daily",
    hasAutomatedScraper: true,
    sourceSection: "EVENTS",
    recentLogs: [{ status: "SUCCESS", itemsFound: 13, itemsCreated: 13, itemsUpdated: 0 }],
    // For example, an event calendar may classify every result as a meeting.
    publishedContentCount: 13,
    now,
  });

  assert.equal(result.status, "HEALTHY");
  assert.equal(result.warning, null);
});

test("zero-result event runs are partial and retain a custom scraper message", () => {
  const result = finalizeScrapeOutcome({
    sourceSection: "EVENTS",
    totalFound: 0,
    failed: 0,
    saved: 0,
    outputMessage: "Calendar request succeeded.",
  });

  assert.equal(result.status, "PARTIAL");
  assert.match(result.message, /^Calendar request succeeded\./);
  assert.match(result.message, /found no items/i);
});

test("zero-result alert runs remain successful", () => {
  const result = finalizeScrapeOutcome({
    sourceSection: "ALERTS",
    totalFound: 0,
    failed: 0,
    saved: 0,
  });

  assert.deepEqual(result, { status: "SUCCESS", message: "Scrape completed." });
});

test("active sources missing a registry entry are degraded", () => {
  const result = assessSourceHealth({
    active: true,
    lastScrapedAt: null,
    scrapeFrequency: "daily",
    hasAutomatedScraper: false,
    sourceSection: "EVENTS",
    recentLogs: [],
    publishedContentCount: 0,
    now,
  });

  assert.equal(result.status, "DEGRADED");
  assert.match(result.warning ?? "", /no registered automated scraper/i);
});

test("inactive sources are paused unless explicitly marked retired", () => {
  const common = {
    active: false,
    lastScrapedAt: null,
    scrapeFrequency: null,
    hasAutomatedScraper: true,
    sourceSection: "EVENTS",
    recentLogs: [],
    publishedContentCount: 0,
    now,
  };

  assert.equal(assessSourceHealth(common).status, "PAUSED");
  assert.equal(assessSourceHealth({ ...common, retired: true }).status, "RETIRED");
  assert.equal(isRetiredSource("Old calendar [RETIRED] 2026-08-01"), true);
});

test("recent run metrics expose volume, outcomes, and failure streak", () => {
  const metrics = summarizeSourceRuns([
    { status: "FAILED", itemsFound: 0, itemsCreated: 0, itemsUpdated: 0, createdAt: now },
    { status: "FAILED", itemsFound: 2, itemsCreated: 0, itemsUpdated: 0, createdAt: latest },
    { status: "SUCCESS", itemsFound: 5, itemsCreated: 2, itemsUpdated: 3, createdAt: latest },
  ]);

  assert.deepEqual(metrics, {
    runs: 3,
    successfulRuns: 1,
    partialRuns: 0,
    failedRuns: 2,
    consecutiveFailures: 2,
    itemsFound: 7,
    itemsCreated: 2,
    itemsUpdated: 3,
    itemsUnchanged: 2,
    successRate: 1 / 3,
    lastSuccessfulAt: latest,
  });
});
