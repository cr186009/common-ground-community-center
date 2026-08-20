import { COVERAGE_CLASSIFICATIONS, classifyCommunityCoverage } from "@/lib/geographic-coverage";

export type PreviewDecision =
  | "NEW"
  | "EXISTING"
  | "CHANGED"
  | "DUPLICATE"
  | "INVALID"
  | "OUT_OF_AREA";

export type PreviewComparableItem = {
  kind: "event" | "alert" | "meeting" | "volunteer";
  title: string;
  date: Date | null;
  endDate: Date | null;
  city: string | null;
  county: string | null;
  sourceName: string;
  sourceUrl: string;
  sourcePageUrl: string;
  valid?: boolean;
  validationError?: string | null;
};

export type ExistingComparableItem = Omit<
  PreviewComparableItem,
  "sourcePageUrl" | "valid" | "validationError"
>;

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameDate(first: Date | null, second: Date | null) {
  return first?.getTime() === second?.getTime();
}

function sameOccurrence(incoming: PreviewComparableItem, existing: ExistingComparableItem) {
  return (
    incoming.kind === existing.kind &&
    normalize(incoming.title) === normalize(existing.title) &&
    normalize(incoming.city) === normalize(existing.city) &&
    sameDate(incoming.date, existing.date)
  );
}

function hasMaterialChanges(incoming: PreviewComparableItem, existing: ExistingComparableItem) {
  return !(
    sameDate(incoming.endDate, existing.endDate) &&
    normalize(incoming.county) === normalize(existing.county) &&
    normalize(incoming.sourceUrl) === normalize(existing.sourceUrl)
  );
}

export function classifyPreviewItem(
  incoming: PreviewComparableItem,
  existingItems: ExistingComparableItem[],
): {
  decision: PreviewDecision;
  reason: string;
  coverage: ReturnType<typeof classifyCommunityCoverage>;
} {
  const coverage = classifyCommunityCoverage({ city: incoming.city, county: incoming.county });
  if (incoming.valid === false) {
    return {
      decision: "INVALID",
      reason: incoming.validationError || "The scraper output is invalid.",
      coverage,
    };
  }

  if (coverage.classification === COVERAGE_CLASSIFICATIONS.OUT_OF_AREA) {
    return {
      decision: "OUT_OF_AREA",
      reason: coverage.distanceMiles === null
        ? "The event is outside the configured coverage area."
        : `The event is ${coverage.distanceMiles.toFixed(1)} miles from the coverage center.`,
      coverage,
    };
  }

  const occurrenceMatches = existingItems.filter((existing) => sameOccurrence(incoming, existing));
  const sameSource = occurrenceMatches.find(
    (existing) => normalize(existing.sourceName) === normalize(incoming.sourceName),
  );
  if (sameSource) {
    return hasMaterialChanges(incoming, sameSource)
      ? { decision: "CHANGED", reason: "A matching source record exists with changed details.", coverage }
      : { decision: "EXISTING", reason: "This item already exists with the same details.", coverage };
  }

  if (occurrenceMatches.length > 0) {
    return { decision: "DUPLICATE", reason: "Another source already provides this item.", coverage };
  }

  const stableDetailUrl = incoming.sourceUrl && incoming.sourceUrl !== incoming.sourcePageUrl;
  if (stableDetailUrl) {
    const identityMatch = existingItems.find(
      (existing) =>
        incoming.kind === existing.kind &&
        normalize(incoming.sourceName) === normalize(existing.sourceName) &&
        normalize(incoming.title) === normalize(existing.title) &&
        normalize(incoming.sourceUrl) === normalize(existing.sourceUrl),
    );
    if (identityMatch) {
      return { decision: "CHANGED", reason: "The source item exists, but its date or location changed.", coverage };
    }
  }

  return { decision: "NEW", reason: "No matching record was found.", coverage };
}
