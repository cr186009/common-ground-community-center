import assert from "node:assert/strict";
import test from "node:test";

import { assessSourceHealth, finalizeScrapeOutcome } from "@/server/scrape-health";

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

  assert.equal(result.status, "WARNING");
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

  assert.equal(result.status, "WARNING");
  assert.match(result.warning ?? "", /no published content/i);
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
