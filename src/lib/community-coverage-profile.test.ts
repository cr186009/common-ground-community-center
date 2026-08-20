import assert from "node:assert/strict";
import test from "node:test";
import { CITY_FILTERS } from "./hub-constants";
import {
  buildCoverageProfiles,
  COMMUNITY_COVERAGE_PROFILES,
  COVERAGE_AREAS,
} from "./community-coverage-profile";

function source(name: string, health = "HEALTHY", automated = true) {
  return { name, health, hasAutomatedScraper: automated } as never;
}

test("profiles include every supported community and every coverage area", () => {
  const profiles = buildCoverageProfiles([]);
  assert.deepEqual(profiles.map((profile) => profile.city), [...CITY_FILTERS]);
  assert.ok(profiles.every((profile) => profile.id.endsWith("-ga")));
  assert.ok(profiles.every((profile) => profile.county.length > 0));
  assert.ok(profiles.every((profile) => profile.areas.length === COVERAGE_AREAS.length));
});

test("coverage is derived from source health and collection mode", () => {
  const canton = buildCoverageProfiles([
    source("Explore Canton events"),
    source("National Weather Service alerts", "FAILING"),
    source("Explore Canton Facebook", "DEGRADED", false),
  ]).find((profile) => profile.city === "Canton")!;
  assert.equal(canton.areas.find((area) => area.id === "arts_entertainment")?.status, "covered");
  assert.equal(canton.areas.find((area) => area.id === "public_safety_weather")?.status, "failing");
  assert.equal(canton.areas.find((area) => area.id === "community_nonprofit")?.status, "manual");
  assert.equal(canton.areas.find((area) => area.id === "schools")?.status, "failing");
});

test("source bundle deduplicates scrapers and records every assigned area", () => {
  const kennesaw = buildCoverageProfiles([
    source("City of Kennesaw events"),
  ]).find((profile) => profile.city === "Kennesaw")!;
  const cityScraper = kennesaw.sourceBundle.find((item) => item.sourceName === "City of Kennesaw events")!;

  assert.equal(kennesaw.sourceBundle.filter((item) => item.sourceName === cityScraper.sourceName).length, 1);
  assert.deepEqual(cityScraper.areas.map((area) => area.areaId), [
    "government",
    "parks_recreation",
    "arts_entertainment",
    "festivals_markets",
  ]);
  assert.equal(cityScraper.collectionMode, "automated");
  assert.equal(cityScraper.source?.health, "HEALTHY");
});

test("communities without a configured category remain visible as missing", () => {
  const rome = buildCoverageProfiles([]).find((profile) => profile.city === "Rome")!;
  assert.equal(rome.areas.find((area) => area.id === "schools")?.status, "missing");
  assert.equal(rome.statusCounts.missing, 6);
  assert.equal(rome.sourceBundle.find((item) => item.sourceName === "Georgia’s Rome Facebook")?.collectionMode, "manual");
});

test("a custom profile can be built without changing the shared registry", () => {
  const custom = buildCoverageProfiles([], [{
    id: "example-ga",
    city: "Example",
    county: "Example",
    areas: { government: [{ sourceName: "Example calendar", role: "primary", collectionMode: "automated" }] },
  }]);

  assert.equal(custom.length, 1);
  assert.equal(custom[0].city, "Example");
  assert.equal(custom[0].areas.find((area) => area.id === "government")?.status, "failing");
  assert.equal(COMMUNITY_COVERAGE_PROFILES.some((profile) => profile.city === "Example"), false);
});
