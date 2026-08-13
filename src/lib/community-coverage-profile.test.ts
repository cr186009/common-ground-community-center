import assert from "node:assert/strict";
import test from "node:test";
import { buildCoverageProfiles, COVERAGE_AREAS } from "./community-coverage-profile";

function source(name: string, health = "HEALTHY", automated = true) {
  return { name, health, hasAutomatedScraper: automated } as never;
}

test("coverage taxonomy is stable and pilot profiles include every area", () => {
  const profiles = buildCoverageProfiles([]);
  assert.deepEqual(profiles.map((profile) => profile.city), ["Canton", "Kennesaw"]);
  assert.ok(profiles.every((profile) => profile.areas.length === COVERAGE_AREAS.length));
});

test("coverage is derived from source health and collection mode", () => {
  const [canton] = buildCoverageProfiles([
    source("Explore Canton events"),
    source("National Weather Service alerts", "FAILING"),
    source("Explore Canton Facebook", "DEGRADED", false),
  ]);
  assert.equal(canton.areas.find((area) => area.id === "arts_entertainment")?.status, "covered");
  assert.equal(canton.areas.find((area) => area.id === "public_safety_weather")?.status, "failing");
  assert.equal(canton.areas.find((area) => area.id === "community_nonprofit")?.status, "manual");
  assert.equal(canton.areas.find((area) => area.id === "schools")?.status, "missing");
});
