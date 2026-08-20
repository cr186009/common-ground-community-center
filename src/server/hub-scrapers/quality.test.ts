import assert from "node:assert/strict";
import test from "node:test";

import { validateScrapedEvent } from "@/server/hub-scrapers/quality";
import type { NormalizedScrapedEvent } from "@/server/hub-scrapers/types";

function fixture(
  overrides: Partial<NormalizedScrapedEvent> = {},
): NormalizedScrapedEvent {
  return {
    title: "Summer Concert",
    startDateTime: new Date("2026-08-07T23:00:00.000Z"),
    city: "Dallas",
    county: "Paulding",
    category: "MUSIC",
    sourceName: "Fixture source",
    sourceUrl: "https://example.gov/events/summer-concert",
    ...overrides,
  };
}

test("quality validation accepts a complete scraper fixture", () => {
  assert.doesNotThrow(() => validateScrapedEvent(fixture()));
});

test("quality validation rejects generic Calendar titles", () => {
  assert.throws(
    () => validateScrapedEvent(fixture({ title: "Calendar" })),
    /generic calendar label/,
  );
});

test("quality validation rejects backwards date ranges", () => {
  assert.throws(
    () =>
      validateScrapedEvent(
        fixture({ endDateTime: new Date("2026-08-07T22:00:00.000Z") }),
      ),
    /invalid end date/,
  );
});
