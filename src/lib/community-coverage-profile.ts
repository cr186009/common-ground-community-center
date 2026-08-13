import type { AdminSourceHealth } from "@/server/hub-data";

export const COVERAGE_AREAS = [
  { id: "government", label: "Government" },
  { id: "schools", label: "Schools" },
  { id: "libraries", label: "Libraries" },
  { id: "parks_recreation", label: "Parks & recreation" },
  { id: "arts_entertainment", label: "Arts & entertainment" },
  { id: "business_chamber", label: "Business & chamber" },
  { id: "community_nonprofit", label: "Community & nonprofit" },
  { id: "public_safety_weather", label: "Public safety & weather" },
  { id: "sports", label: "Sports" },
  { id: "festivals_markets", label: "Festivals & markets" },
] as const;

export type CoverageAreaId = (typeof COVERAGE_AREAS)[number]["id"];
export type CoverageProfileStatus = "covered" | "partial" | "missing" | "manual" | "failing";
type SourceRole = "primary" | "backup";

type Mapping = { sourceName: string; role: SourceRole };
type CityConfig = { city: string; areas: Partial<Record<CoverageAreaId, Mapping[]>> };

/** Deliberately explicit: adding a scraper does not silently imply community coverage. */
export const PILOT_CITY_COVERAGE: CityConfig[] = [
  {
    city: "Canton",
    areas: {
      government: [{ sourceName: "Explore Canton events", role: "primary" }],
      parks_recreation: [{ sourceName: "Explore Canton events", role: "primary" }],
      arts_entertainment: [{ sourceName: "Explore Canton events", role: "primary" }],
      festivals_markets: [{ sourceName: "Explore Canton events", role: "primary" }],
      public_safety_weather: [{ sourceName: "National Weather Service alerts", role: "primary" }],
      community_nonprofit: [{ sourceName: "Explore Canton Facebook", role: "primary" }],
    },
  },
  {
    city: "Kennesaw",
    areas: {
      government: [{ sourceName: "City of Kennesaw events", role: "primary" }],
      parks_recreation: [{ sourceName: "City of Kennesaw events", role: "primary" }],
      arts_entertainment: [{ sourceName: "City of Kennesaw events", role: "primary" }],
      festivals_markets: [{ sourceName: "City of Kennesaw events", role: "primary" }],
      public_safety_weather: [{ sourceName: "National Weather Service alerts", role: "primary" }],
    },
  },
];

function sourceStatus(source: AdminSourceHealth): CoverageProfileStatus {
  if (source.health === "FAILING") return "failing";
  if (!source.hasAutomatedScraper) return "manual";
  if (source.health === "HEALTHY") return "covered";
  return "partial";
}

export function buildCoverageProfiles(sources: AdminSourceHealth[]) {
  const byName = new Map(sources.map((source) => [source.name.toLocaleLowerCase("en-US"), source]));

  return PILOT_CITY_COVERAGE.map((config) => ({
    city: config.city,
    areas: COVERAGE_AREAS.map((area) => {
      const configured = config.areas[area.id] ?? [];
      const mapped = configured.map((mapping) => ({
        ...mapping,
        source: byName.get(mapping.sourceName.toLocaleLowerCase("en-US")) ?? null,
      }));
      const statuses = mapped.map(({ source }) => source ? sourceStatus(source) : "failing");
      let status: CoverageProfileStatus = "missing";
      if (statuses.includes("covered")) status = "covered";
      else if (statuses.includes("partial")) status = "partial";
      else if (statuses.includes("manual")) status = "manual";
      else if (configured.length > 0) status = "failing";

      return { ...area, status, sources: mapped };
    }),
  }));
}
