import { cleanPublicText, cleanText, dedupeNormalizedEvents, inferCategory } from "@/server/hub-scrapers/helpers";
import type { NormalizedScrapedEvent, SourceScraper } from "@/server/hub-scrapers/types";

const WOODSTOCK_EVENTS_API =
  "https://api.imgoingcalendar.com/api/visitors/WoodstockGA/events?limit=250";

type ImGoingEventTime = {
  startTime?: string;
  endTime?: string;
};

type ImGoingEvent = {
  _id?: string;
  title?: string;
  name?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  eventTimes?: ImGoingEventTime[];
  eventLink?: string;
  hostLink?: string;
  isApproved?: boolean;
  isBlocked?: boolean;
  isCancelled?: boolean;
  isRemoved?: boolean;
  cover?: { source?: string };
  venueInfo?: { name?: string };
  owner?: { name?: string };
  address?: { address?: string };
  categories?: Array<string | { name?: string }>;
  customCategories?: Array<string | { name?: string }>;
};

function validDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function categoryNames(event: ImGoingEvent) {
  return [...(event.categories ?? []), ...(event.customCategories ?? [])]
    .map((category) => cleanText(typeof category === "string" ? category : category.name))
    .filter(Boolean);
}

/** Convert the official Visit Woodstock calendar API response into hub events. */
export function parseWoodstockEvents(
  payload: unknown,
  source: { name: string; url: string; city?: string | null; county?: string | null },
  now = new Date(),
) {
  if (!Array.isArray(payload)) return [];

  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  const events: NormalizedScrapedEvent[] = [];

  for (const item of payload as ImGoingEvent[]) {
    if (item.isApproved === false || item.isBlocked || item.isCancelled || item.isRemoved) continue;

    const title = cleanText(item.title ?? item.name);
    if (!title) continue;

    const instances = item.eventTimes?.length
      ? item.eventTimes
      : [{ startTime: item.startTime, endTime: item.endTime }];

    for (const instance of instances) {
      const startDateTime = validDate(instance.startTime ?? item.startTime);
      const candidateEnd = validDate(instance.endTime ?? item.endTime);
      if (!startDateTime || (candidateEnd ?? startDateTime) < cutoff) continue;

      const endDateTime = candidateEnd && candidateEnd >= startDateTime ? candidateEnd : null;
      const description = cleanPublicText(item.description) || null;
      const locationName = cleanText(item.venueInfo?.name ?? item.owner?.name) || "Woodstock";
      const address = cleanText(item.address?.address) || null;
      const platformCategories = categoryNames(item);
      const combinedText = [title, description, locationName, address, ...platformCategories]
        .filter(Boolean)
        .join(" ");

      events.push({
        title,
        description,
        startDateTime,
        endDateTime,
        locationName,
        address,
        city: source.city || "Woodstock",
        county: source.county || "Cherokee",
        category: inferCategory(combinedText),
        tags: Array.from(new Set(["official calendar", "Visit Woodstock GA", ...platformCategories])),
        cost: /\bfree\b/i.test(combinedText) ? "Free" : null,
        isFree: /\bfree\b/i.test(combinedText),
        isKidFriendly: /\b(kids?|children|child|family|youth|teen)\b/i.test(combinedText),
        isOutdoor: /\b(park|outdoor|festival|concert|market|trail|garden|amphitheater)\b/i.test(combinedText),
        sourceName: source.name,
        sourceUrl: source.url,
        originalUrl: item.eventLink ?? item.hostLink ?? source.url,
        imageUrl: item.cover?.source ?? null,
        confidenceScore: 0.94,
        timeZone: "America/New_York",
      });
    }
  }

  return dedupeNormalizedEvents(events);
}

export const woodstockOfficialScraper: SourceScraper = {
  sourceName: "Visit Woodstock events",

  async scrape(source) {
    const response = await fetch(WOODSTOCK_EVENTS_API, {
      headers: { accept: "application/json", "user-agent": "Common Ground Community Center event importer" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Woodstock calendar request failed: ${response.status} ${response.statusText}`);
    }

    const events = parseWoodstockEvents(await response.json(), source);
    return {
      events,
      status: events.length ? "SUCCESS" : "PARTIAL",
      message: events.length
        ? `Parsed ${events.length} upcoming events from the official Visit Woodstock calendar.`
        : "The Visit Woodstock calendar loaded but returned no upcoming events.",
    };
  },
};
