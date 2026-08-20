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
export type CoverageSourceRole = "primary" | "backup";
export type CoverageCollectionMode = "automated" | "manual";

export type CoverageSourceMapping = {
  sourceName: string;
  role: CoverageSourceRole;
  collectionMode?: CoverageCollectionMode;
};

export type CommunityCoverageConfig = {
  id: string;
  city: string;
  county: string;
  areas: Partial<Record<CoverageAreaId, CoverageSourceMapping[]>>;
};

const automated = (sourceName: string, role: CoverageSourceRole = "primary"): CoverageSourceMapping => ({
  sourceName,
  role,
  collectionMode: "automated",
});

const manual = (sourceName: string, role: CoverageSourceRole = "primary"): CoverageSourceMapping => ({
  sourceName,
  role,
  collectionMode: "manual",
});

const weather = automated("National Weather Service alerts");

/**
 * Portable community profiles. Each source is assigned deliberately so adding a
 * scraper to the fleet never silently claims that it covers a community.
 */
export const COMMUNITY_COVERAGE_PROFILES: CommunityCoverageConfig[] = [
  {
    id: "dallas-ga",
    city: "Dallas",
    county: "Paulding",
    areas: {
      government: [automated("City of Dallas official events page"), automated("Paulding County Public Calendar", "backup")],
      schools: [automated("Paulding County School District events")],
      libraries: [automated("West Georgia Regional Library events")],
      parks_recreation: [automated("Paulding County Public Calendar")],
      arts_entertainment: [automated("Downtown Dallas / MyDallasGA")],
      business_chamber: [automated("Downtown Dallas / MyDallasGA")],
      community_nonprofit: [manual("What’s Happening in Dallas, Georgia Facebook")],
      public_safety_weather: [weather, manual("Paulding County Sheriff Facebook", "backup"), manual("Dallas Police Facebook", "backup")],
      sports: [automated("Paulding County School District events")],
      festivals_markets: [automated("Downtown Dallas / MyDallasGA")],
    },
  },
  {
    id: "hiram-ga", city: "Hiram", county: "Paulding", areas: {
      government: [automated("City of Hiram official site")],
      schools: [automated("Paulding County School District events")],
      libraries: [automated("West Georgia Regional Library events")],
      parks_recreation: [automated("Paulding County Public Calendar")],
      arts_entertainment: [automated("City of Hiram official site")],
      community_nonprofit: [manual("City of Hiram Facebook")],
      public_safety_weather: [weather, manual("Hiram Police Facebook", "backup")],
      sports: [automated("Paulding County School District events")],
      festivals_markets: [automated("City of Hiram official site")],
    },
  },
  {
    id: "rockmart-ga", city: "Rockmart", county: "Polk", areas: {
      government: [automated("City of Rockmart official site"), automated("Polk County official calendar", "backup")],
      arts_entertainment: [automated("Rockmart Cultural Arts Center")],
      business_chamber: [automated("Polk County Chamber events")],
      community_nonprofit: [manual("City of Rockmart Facebook")],
      public_safety_weather: [weather, manual("Rockmart Police Facebook", "backup")],
      festivals_markets: [automated("City of Rockmart official site"), automated("Polk County Chamber events", "backup")],
    },
  },
  {
    id: "cedartown-ga", city: "Cedartown", county: "Polk", areas: {
      government: [automated("Polk County official calendar")],
      arts_entertainment: [automated("Downtown Cedartown events page")],
      business_chamber: [automated("Polk County Chamber events")],
      community_nonprofit: [manual("City of Cedartown Facebook")],
      public_safety_weather: [weather, manual("Cedartown Police Facebook", "backup")],
      festivals_markets: [automated("Downtown Cedartown events page")],
    },
  },
  {
    id: "woodstock-ga", city: "Woodstock", county: "Cherokee", areas: {
      government: [automated("Visit Woodstock events")],
      parks_recreation: [automated("Cherokee Recreation & Parks events")],
      arts_entertainment: [automated("Visit Woodstock events")],
      community_nonprofit: [manual("Downtown Woodstock Facebook")],
      public_safety_weather: [weather],
      festivals_markets: [automated("Visit Woodstock events")],
    },
  },
  {
    id: "rome-ga", city: "Rome", county: "Floyd", areas: {
      arts_entertainment: [manual("Georgia’s Rome Facebook")],
      community_nonprofit: [manual("Georgia’s Rome Facebook")],
      public_safety_weather: [weather],
      festivals_markets: [manual("Georgia’s Rome Facebook")],
    },
  },
  {
    id: "canton-ga", city: "Canton", county: "Cherokee", areas: {
      government: [automated("Explore Canton events")],
      schools: [automated("Cherokee County School District — Canton coverage")],
      parks_recreation: [automated("Cherokee Recreation & Parks events"), automated("Explore Canton events", "backup")],
      arts_entertainment: [automated("Explore Canton events")],
      business_chamber: [automated("Cherokee County Chamber events")],
      festivals_markets: [automated("Explore Canton events")],
      public_safety_weather: [weather],
      community_nonprofit: [manual("Explore Canton Facebook")],
    },
  },
  {
    id: "adairsville-ga", city: "Adairsville", county: "Bartow", areas: {
      community_nonprofit: [manual("City of Adairsville Facebook")],
      public_safety_weather: [weather],
      festivals_markets: [manual("City of Adairsville Facebook")],
    },
  },
  {
    id: "marietta-ga", city: "Marietta", county: "Cobb", areas: {
      government: [automated("City of Marietta calendar")],
      parks_recreation: [automated("City of Marietta calendar")],
      arts_entertainment: [automated("City of Marietta calendar")],
      public_safety_weather: [weather],
      festivals_markets: [automated("City of Marietta calendar")],
    },
  },
  {
    id: "acworth-ga", city: "Acworth", county: "Cobb", areas: {
      government: [automated("City of Acworth Events")],
      libraries: [automated("West Georgia Regional Library events")],
      parks_recreation: [automated("City of Acworth Events")],
      arts_entertainment: [automated("City of Acworth Events")],
      public_safety_weather: [weather],
      festivals_markets: [automated("City of Acworth Events")],
    },
  },
  {
    id: "kennesaw-ga", city: "Kennesaw", county: "Cobb", areas: {
      government: [automated("City of Kennesaw events")],
      schools: [automated("Cobb Schools — Kennesaw campuses")],
      libraries: [automated("North Cobb Regional Library events")],
      parks_recreation: [automated("City of Kennesaw events")],
      arts_entertainment: [automated("City of Kennesaw events"), automated("Kennesaw State University public events", "backup")],
      community_nonprofit: [automated("Kennesaw State University public events")],
      festivals_markets: [automated("City of Kennesaw events")],
      public_safety_weather: [weather],
      sports: [automated("Kennesaw State University public events")],
    },
  },
  {
    id: "smyrna-ga", city: "Smyrna", county: "Cobb", areas: {
      community_nonprofit: [manual("City of Smyrna Instagram/manual source")],
      public_safety_weather: [weather],
      festivals_markets: [manual("City of Smyrna Instagram/manual source")],
    },
  },
  {
    id: "powder-springs-ga", city: "Powder Springs", county: "Cobb", areas: {
      community_nonprofit: [manual("City of Powder Springs Facebook")],
      public_safety_weather: [weather],
      festivals_markets: [manual("City of Powder Springs Facebook")],
    },
  },
];

/** @deprecated Use COMMUNITY_COVERAGE_PROFILES; retained for existing callers. */
export const PILOT_CITY_COVERAGE = COMMUNITY_COVERAGE_PROFILES;

function sourceStatus(source: AdminSourceHealth): CoverageProfileStatus {
  if (source.health === "FAILING") return "failing";
  if (!source.hasAutomatedScraper) return "manual";
  if (source.health === "HEALTHY") return "covered";
  return "partial";
}

export function buildCoverageProfiles(
  sources: AdminSourceHealth[],
  configs: CommunityCoverageConfig[] = COMMUNITY_COVERAGE_PROFILES,
) {
  const byName = new Map(sources.map((source) => [source.name.toLocaleLowerCase("en-US"), source]));

  return configs.map((config) => {
    const areas = COVERAGE_AREAS.map((area) => {
      const configured = config.areas[area.id] ?? [];
      const mapped = configured.map((mapping) => ({
        ...mapping,
        collectionMode: mapping.collectionMode ?? "automated",
        source: byName.get(mapping.sourceName.toLocaleLowerCase("en-US")) ?? null,
      }));
      const statuses = mapped.map(({ source }) => source ? sourceStatus(source) : "failing");
      let status: CoverageProfileStatus = "missing";
      if (statuses.includes("covered")) status = "covered";
      else if (statuses.includes("partial")) status = "partial";
      else if (statuses.includes("manual")) status = "manual";
      else if (configured.length > 0) status = "failing";

      return { ...area, status, sources: mapped };
    });

    const sourceBundle = Array.from(
      new Set(areas.flatMap((area) => area.sources.map((mapping) => mapping.sourceName))),
    ).map((sourceName) => {
      const areaMappings = areas.flatMap((area) => area.sources
        .filter((mapping) => mapping.sourceName === sourceName)
        .map((mapping) => ({ areaId: area.id, role: mapping.role })));
      const firstMapping = areas.flatMap((area) => area.sources).find((mapping) => mapping.sourceName === sourceName)!;
      return {
        sourceName,
        collectionMode: firstMapping.collectionMode,
        source: firstMapping.source,
        areas: areaMappings,
      };
    });

    const statusCounts = areas.reduce<Record<CoverageProfileStatus, number>>(
      (counts, area) => ({ ...counts, [area.status]: counts[area.status] + 1 }),
      { covered: 0, partial: 0, missing: 0, manual: 0, failing: 0 },
    );

    return {
      id: config.id,
      city: config.city,
      county: config.county,
      areas,
      sourceBundle,
      statusCounts,
    };
  });
}
