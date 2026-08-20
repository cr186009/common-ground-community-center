import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyCommunityCoverage,
  classifyCoverage,
  COVERAGE_CLASSIFICATIONS,
  distanceMilesBetween,
  resolveCoveragePolicy,
} from "@/lib/geographic-coverage";

test("haversine distance is symmetric and returns zero for the same point", () => {
  const dallas = { latitude: 33.9237, longitude: -84.8408 };
  const hiram = { latitude: 33.8757, longitude: -84.7622 };

  assert.equal(distanceMilesBetween(dallas, dallas), 0);
  assert.ok(Math.abs(distanceMilesBetween(dallas, hiram) - distanceMilesBetween(hiram, dallas)) < 1e-9);
  assert.ok(distanceMilesBetween(dallas, hiram) > 5);
  assert.ok(distanceMilesBetween(dallas, hiram) < 6);
});

test("known Paulding County records are core coverage without coordinates", () => {
  const result = classifyCoverage({ county: "Paulding County" });

  assert.equal(result.classification, COVERAGE_CLASSIFICATIONS.CORE_PAULDING);
  assert.equal(result.distanceMiles, null);
  assert.equal(result.reason, "core-county");
});

test("coordinates drive within-radius, borderline, and out-of-area classifications", () => {
  const center = { latitude: 0, longitude: 0 };
  const policy = { center, radiusMiles: 25, borderlineMiles: 5 };

  assert.equal(
    classifyCoverage({ latitude: 0, longitude: 0.3 }, policy).classification,
    COVERAGE_CLASSIFICATIONS.WITHIN_RADIUS,
  );
  assert.equal(
    classifyCoverage({ latitude: 0, longitude: 0.42 }, policy).classification,
    COVERAGE_CLASSIFICATIONS.BORDERLINE,
  );
  assert.equal(
    classifyCoverage({ latitude: 0, longitude: 0.5 }, policy).classification,
    COVERAGE_CLASSIFICATIONS.OUT_OF_AREA,
  );
});

test("missing or invalid non-core coordinates remain unknown", () => {
  assert.equal(
    classifyCoverage({ county: "Cobb" }).classification,
    COVERAGE_CLASSIFICATIONS.UNKNOWN,
  );
  assert.equal(
    classifyCoverage({ county: "Cobb", latitude: 100, longitude: -84 }).classification,
    COVERAGE_CLASSIFICATIONS.UNKNOWN,
  );
});

test("coverage center, radius, buffer, and core county are configurable", () => {
  const result = classifyCoverage(
    { county: "Polk County" },
    {
      center: { latitude: 34.0143, longitude: -85.2533 },
      radiusMiles: 10,
      borderlineMiles: 2,
      coreCounty: "Polk",
    },
  );

  assert.equal(result.classification, COVERAGE_CLASSIFICATIONS.CORE_PAULDING);
});

test("invalid policy values are rejected", () => {
  assert.throws(() => resolveCoveragePolicy({ radiusMiles: 0 }), /greater than zero/);
  assert.throws(() => resolveCoveragePolicy({ borderlineMiles: -1 }), /cannot be negative/);
  assert.throws(
    () => resolveCoveragePolicy({ center: { latitude: 91, longitude: 0 } }),
    /invalid coordinates/,
  );
  assert.throws(
    () => distanceMilesBetween({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 181 }),
    /Longitude|longitude/,
  );
});

test("known community centers support source-level radius review", () => {
  assert.equal(
    classifyCommunityCoverage({ city: "Hiram", county: "Paulding" }).classification,
    COVERAGE_CLASSIFICATIONS.CORE_PAULDING,
  );
  assert.equal(
    classifyCommunityCoverage({ city: "Rockmart", county: "Polk" }).classification,
    COVERAGE_CLASSIFICATIONS.WITHIN_RADIUS,
  );
  assert.equal(
    classifyCommunityCoverage({ city: "Rome", county: "Floyd" }).classification,
    COVERAGE_CLASSIFICATIONS.BORDERLINE,
  );
});
