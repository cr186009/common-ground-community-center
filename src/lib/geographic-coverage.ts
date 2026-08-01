export const COVERAGE_CLASSIFICATIONS = {
  CORE_PAULDING: "CORE_PAULDING",
  WITHIN_RADIUS: "WITHIN_RADIUS",
  BORDERLINE: "BORDERLINE",
  OUT_OF_AREA: "OUT_OF_AREA",
  UNKNOWN: "UNKNOWN",
} as const;

export type CoverageClassification =
  (typeof COVERAGE_CLASSIFICATIONS)[keyof typeof COVERAGE_CLASSIFICATIONS];

export type GeographicPoint = {
  latitude: number;
  longitude: number;
};

export type CoveragePolicy = {
  center: GeographicPoint;
  radiusMiles: number;
  borderlineMiles: number;
  coreCounty: string;
};

export type CoverageCandidate = {
  latitude?: number | null;
  longitude?: number | null;
  county?: string | null;
};

export const COMMUNITY_COORDINATES: Readonly<Record<string, GeographicPoint>> = Object.freeze({
  acworth: { latitude: 34.0664, longitude: -84.6769 },
  adairsville: { latitude: 34.3687, longitude: -84.9341 },
  canton: { latitude: 34.2368, longitude: -84.4908 },
  cartersville: { latitude: 34.1651, longitude: -84.7999 },
  cedartown: { latitude: 34.0112, longitude: -85.2559 },
  dallas: { latitude: 33.9237, longitude: -84.8408 },
  douglasville: { latitude: 33.7515, longitude: -84.7477 },
  hiram: { latitude: 33.8757, longitude: -84.7622 },
  kennesaw: { latitude: 34.0234, longitude: -84.6155 },
  marietta: { latitude: 33.9526, longitude: -84.5499 },
  "powder springs": { latitude: 33.8595, longitude: -84.6838 },
  rockmart: { latitude: 34.0026, longitude: -85.0416 },
  rome: { latitude: 34.257, longitude: -85.1647 },
  smyrna: { latitude: 33.8839, longitude: -84.5144 },
  "villa rica": { latitude: 33.7321, longitude: -84.9191 },
  woodstock: { latitude: 34.1015, longitude: -84.5194 },
});

export type CoverageResult = {
  classification: CoverageClassification;
  distanceMiles: number | null;
  reason: "core-county" | "inside-radius" | "borderline-buffer" | "outside-radius" | "missing-location";
};

/** Dallas City Hall, used as a stable center point for central Paulding County. */
export const DEFAULT_COVERAGE_POLICY: Readonly<CoveragePolicy> = Object.freeze({
  center: Object.freeze({ latitude: 33.9237, longitude: -84.8408 }),
  radiusMiles: 25,
  borderlineMiles: 5,
  coreCounty: "Paulding",
});

const EARTH_RADIUS_MILES = 3958.7613;

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function isValidPoint(point: GeographicPoint) {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

function normalizeCounty(value?: string | null) {
  return value
    ?.trim()
    .toLocaleLowerCase("en-US")
    .replace(/\s+county$/, "");
}

export function distanceMilesBetween(from: GeographicPoint, to: GeographicPoint) {
  if (!isValidPoint(from) || !isValidPoint(to)) {
    throw new RangeError("Latitude must be between -90 and 90 and longitude between -180 and 180.");
  }

  const latitudeDelta = degreesToRadians(to.latitude - from.latitude);
  const longitudeDelta = degreesToRadians(to.longitude - from.longitude);
  const fromLatitude = degreesToRadians(from.latitude);
  const toLatitude = degreesToRadians(to.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export function resolveCoveragePolicy(
  overrides: Partial<CoveragePolicy> = {},
): CoveragePolicy {
  const policy = {
    ...DEFAULT_COVERAGE_POLICY,
    ...overrides,
    center: overrides.center ?? DEFAULT_COVERAGE_POLICY.center,
  };

  if (!isValidPoint(policy.center)) {
    throw new RangeError("Coverage center has invalid coordinates.");
  }
  if (!Number.isFinite(policy.radiusMiles) || policy.radiusMiles <= 0) {
    throw new RangeError("Coverage radius must be greater than zero.");
  }
  if (!Number.isFinite(policy.borderlineMiles) || policy.borderlineMiles < 0) {
    throw new RangeError("Coverage borderline buffer cannot be negative.");
  }
  if (!policy.coreCounty.trim()) {
    throw new RangeError("Coverage core county cannot be empty.");
  }

  return policy;
}

export function classifyCoverage(
  candidate: CoverageCandidate,
  overrides: Partial<CoveragePolicy> = {},
): CoverageResult {
  const policy = resolveCoveragePolicy(overrides);
  const isCoreCounty =
    normalizeCounty(candidate.county) === normalizeCounty(policy.coreCounty);
  const hasCoordinates =
    candidate.latitude !== null &&
    candidate.latitude !== undefined &&
    candidate.longitude !== null &&
    candidate.longitude !== undefined;

  let distanceMiles: number | null = null;
  if (hasCoordinates) {
    const point = {
      latitude: candidate.latitude as number,
      longitude: candidate.longitude as number,
    };
    if (isValidPoint(point)) {
      distanceMiles = distanceMilesBetween(policy.center, point);
    }
  }

  // A known Paulding County record is core coverage even when it has not yet
  // been geocoded. County identity is more reliable than a missing venue pin.
  if (isCoreCounty) {
    return { classification: COVERAGE_CLASSIFICATIONS.CORE_PAULDING, distanceMiles, reason: "core-county" };
  }

  if (distanceMiles === null) {
    return { classification: COVERAGE_CLASSIFICATIONS.UNKNOWN, distanceMiles, reason: "missing-location" };
  }
  if (distanceMiles <= policy.radiusMiles) {
    return { classification: COVERAGE_CLASSIFICATIONS.WITHIN_RADIUS, distanceMiles, reason: "inside-radius" };
  }
  if (distanceMiles <= policy.radiusMiles + policy.borderlineMiles) {
    return { classification: COVERAGE_CLASSIFICATIONS.BORDERLINE, distanceMiles, reason: "borderline-buffer" };
  }

  return { classification: COVERAGE_CLASSIFICATIONS.OUT_OF_AREA, distanceMiles, reason: "outside-radius" };
}

/** Source-level estimate used when a precise venue pin is not available yet. */
export function classifyCommunityCoverage({
  city,
  county,
}: {
  city?: string | null;
  county?: string | null;
}) {
  const coordinates = city
    ? COMMUNITY_COORDINATES[city.trim().toLocaleLowerCase("en-US")]
    : undefined;
  return classifyCoverage({ ...coordinates, county });
}
