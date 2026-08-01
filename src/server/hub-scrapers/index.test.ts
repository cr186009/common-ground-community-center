import assert from "node:assert/strict";
import test from "node:test";

import {
  getSupportedScraperNames,
  hasRegisteredScraper,
  isLikelySameEvent,
  normalizeSourceName,
} from "./index";

test("source-name matching tolerates admin capitalization and whitespace", () => {
  assert.equal(
    normalizeSourceName("  City   of Acworth EVENTS "),
    "city of acworth events",
  );
  assert.equal(hasRegisteredScraper("City of Acworth Events"), true);
  assert.equal(hasRegisteredScraper(" Visit   Woodstock events "), true);
});

test("supported scraper names remain canonical for CLI display", () => {
  assert.ok(getSupportedScraperNames().includes("City of Acworth events"));
  assert.ok(getSupportedScraperNames().includes("City of Rockmart official site"));
  assert.ok(getSupportedScraperNames().includes("Polk County Chamber events"));
  assert.ok(getSupportedScraperNames().includes("Polk County official calendar"));
  assert.ok(getSupportedScraperNames().includes("Rockmart Cultural Arts Center"));
});

test("unregistered sources do not match", () => {
  assert.equal(hasRegisteredScraper("Unrelated Community Calendar"), false);
});

test("cross-calendar duplicate matching ignores punctuation and city casing", () => {
  const startDateTime = new Date("2026-11-14T17:00:00.000Z");

  assert.equal(
    isLikelySameEvent(
      {
        title: "RCAC Holiday Festival!",
        city: "Rockmart",
        startDateTime,
      },
      {
        title: "RCAC Holiday Festival",
        city: "ROCKMART",
        startDateTime,
      },
    ),
    true,
  );

  assert.equal(
    isLikelySameEvent(
      {
        title: "RCAC Holiday Festival",
        city: "Rockmart",
        startDateTime,
      },
      {
        title: "RCAC Holiday Festival",
        city: "Rockmart",
        startDateTime: new Date("2026-11-14T18:00:00.000Z"),
      },
    ),
    false,
  );
});
