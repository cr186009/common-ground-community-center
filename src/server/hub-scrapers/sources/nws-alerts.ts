import type { AlertSeverity, AlertType } from "@prisma/client";

import type {
  NormalizedScrapedAlert,
  ScrapeOutput,
  SourceScraper,
} from "@/server/hub-scrapers/types";

const SOURCE_NAME = "National Weather Service alerts";

const COUNTY_TARGETS = [
  { county: "Paulding", sameCode: "013223", ugcCode: "GAZ032" },
  { county: "Polk",     sameCode: "013233", ugcCode: "GAZ031" },
  { county: "Cobb",     sameCode: "013067", ugcCode: "GAZ033" },
  { county: "Bartow",   sameCode: "013015", ugcCode: "GAZ020" },
  { county: "Cherokee", sameCode: "013057", ugcCode: "GAZ021" },
] as const;

function mapSeverity(severity: string): AlertSeverity {
  switch (severity) {
    case "Extreme":  return "EMERGENCY";
    case "Severe":   return "HIGH";
    case "Moderate": return "MEDIUM";
    default:         return "LOW";
  }
}

function mapAlertType(event: string, headline: string): AlertType {
  const text = `${event} ${headline}`.toLowerCase();

  if (
    text.includes("child abduction") ||
    text.includes("missing person") ||
    text.includes("amber")
  ) {
    return "MISSING_PERSON";
  }

  if (
    text.includes("911") ||
    text.includes("utility") ||
    text.includes("power outage")
  ) {
    return "UTILITY_OUTAGE";
  }

  if (text.includes("civil emergency") || text.includes("local emergency")) {
    return "EMERGENCY_NOTICE";
  }

  if (
    text.includes("evacuation") ||
    text.includes("shelter") ||
    text.includes("law enforcement") ||
    text.includes("hazardous material") ||
    text.includes("hazmat")
  ) {
    return "PUBLIC_SAFETY";
  }

  return "SEVERE_WEATHER";
}

type NwsFeature = {
  id: string;
  properties: {
    status: string;
    messageType: string;
    severity: string;
    headline?: string | null;
    event: string;
    description?: string | null;
    instruction?: string | null;
    areaDesc?: string | null;
    geocode?: { SAME?: string[]; UGC?: string[] };
    onset?: string | null;
    effective?: string | null;
    sent?: string | null;
    ends?: string | null;
    expires?: string | null;
  };
};

export const nwsAlertsScraper: SourceScraper = {
  sourceName: SOURCE_NAME,

  async scrape(source): Promise<ScrapeOutput> {
    const response = await fetch(source.url, {
      headers: {
        Accept: "application/geo+json",
        "User-Agent": "events.miller4ga.com community alert aggregator",
      },
    });

    if (!response.ok) {
      throw new Error(`NWS API responded with HTTP ${response.status}`);
    }

    const geojson = (await response.json()) as { features?: NwsFeature[] };
    const alerts: NormalizedScrapedAlert[] = [];

    for (const feature of geojson.features ?? []) {
      const p = feature.properties;

      // Ignore non-Actual statuses and explicit cancellations
      if (p.status !== "Actual") continue;
      if (p.messageType === "Cancel") continue;

      const same = p.geocode?.SAME ?? [];
      const ugc  = p.geocode?.UGC  ?? [];
      const areaDesc = (p.areaDesc ?? "").toLowerCase();

      // Collect all counties this alert affects
      const matchedCounties = COUNTY_TARGETS.filter(
        (t) =>
          same.includes(t.sameCode) ||
          ugc.includes(t.ugcCode) ||
          areaDesc.includes(t.county.toLowerCase()),
      ).map((t) => t.county);

      if (matchedCounties.length === 0) continue;

      const title = (p.headline?.trim() || p.event).trim();

      const description =
        [p.description, p.instruction].filter(Boolean).join("\n\n") || null;

      const startsAt =
        p.onset     ? new Date(p.onset)     :
        p.effective ? new Date(p.effective) :
        p.sent      ? new Date(p.sent)      :
        null;

      const expiresAt =
        p.ends    ? new Date(p.ends)    :
        p.expires ? new Date(p.expires) :
        null;

      // One normalized alert per NWS feature — county is set to "Georgia"
      // (statewide primary) and all matched counties go into affectedCounties.
      alerts.push({
        title,
        description,
        alertType: mapAlertType(p.event, p.headline ?? ""),
        severity:  mapSeverity(p.severity),
        county:    "Georgia",
        city:      null,
        affectedCounties: matchedCounties,
        sourceName: SOURCE_NAME,
        sourceUrl:  source.url,
        originalUrl: feature.id,
        startsAt,
        expiresAt,
        status: "ACTIVE",
      });
    }

    // Return SUCCESS even when there are zero current alerts
    return { status: "SUCCESS", alerts };
  },
};
