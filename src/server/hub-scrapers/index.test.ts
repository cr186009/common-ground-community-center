import assert from "node:assert/strict";
import test from "node:test";

import {
  getSupportedScraperNames,
  hasRegisteredScraper,
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
});

test("unregistered sources do not match", () => {
  assert.equal(hasRegisteredScraper("Unrelated Community Calendar"), false);
});
