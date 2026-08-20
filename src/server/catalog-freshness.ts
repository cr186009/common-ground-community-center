import { sourceFreshnessSlo } from "@/server/scrape-health";

export type CatalogFreshnessSource = {
  scrapeFrequency: string | null;
  lastSuccessfulAt: Date | null;
};

export type CatalogFreshness = {
  status: "CURRENT" | "STALE" | "UNKNOWN";
  asOf: Date | null;
  relevantSourceCount: number;
  overdueSourceCount: number;
};

/**
 * A catalog is current only when every relevant automated source is within its
 * own freshness SLO. `asOf` is the oldest successful check in that healthy
 * set, never an unrelated or merely newest global scrape.
 */
export function summarizeCatalogFreshness(
  sources: CatalogFreshnessSource[],
  now = new Date(),
): CatalogFreshness {
  if (sources.length === 0) {
    return { status: "UNKNOWN", asOf: null, relevantSourceCount: 0, overdueSourceCount: 0 };
  }

  const overdueSourceCount = sources.filter((source) => {
    if (!source.lastSuccessfulAt) return true;
    const { overdueAfterMs } = sourceFreshnessSlo(source.scrapeFrequency);
    return now.getTime() > source.lastSuccessfulAt.getTime() + overdueAfterMs;
  }).length;

  if (overdueSourceCount > 0) {
    return {
      status: "STALE",
      asOf: null,
      relevantSourceCount: sources.length,
      overdueSourceCount,
    };
  }

  return {
    status: "CURRENT",
    asOf: new Date(Math.min(...sources.map((source) => source.lastSuccessfulAt!.getTime()))),
    relevantSourceCount: sources.length,
    overdueSourceCount: 0,
  };
}
