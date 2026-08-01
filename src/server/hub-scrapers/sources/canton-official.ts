import * as cheerio from "cheerio";
import { fromZonedTime } from "date-fns-tz";

import { cleanPublicText, cleanText, dedupeNormalizedEvents, inferCategory, toAbsoluteUrl } from "@/server/hub-scrapers/helpers";
import type { NormalizedScrapedEvent, SourceScraper } from "@/server/hub-scrapers/types";

const CANTON_BASE_URL = "https://www.cantonga.gov";
const EXPLORE_CANTON_BASE_URL = "https://explorecantonga.com";
const EXPLORE_CANTON_EVENTS_URL = `${EXPLORE_CANTON_BASE_URL}/events/`;
const EASTERN_TIME_ZONE = "America/New_York";
const MAX_EXPLORE_CANTON_PAGES = 10;

function parseEasternDate(value: string) {
  const match = cleanText(value).match(
    /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(20\d{2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)\b/i,
  );
  if (!match) return null;

  let hour = Number(match[4]);
  if (match[6].toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (match[6].toUpperCase() === "AM" && hour === 12) hour = 0;

  const local = `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}T${String(hour).padStart(2, "0")}:${match[5]}:00`;
  const parsed = fromZonedTime(local, EASTERN_TIME_ZONE);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = easternParts(parsed);
  if (
    Number(parts.year) !== Number(match[3]) ||
    Number(parts.month) !== Number(match[1]) ||
    Number(parts.day) !== Number(match[2]) ||
    Number(parts.hour) !== hour ||
    Number(parts.minute) !== Number(match[5])
  ) return null;
  return parsed;
}

/** Parse CivicPlus list markup used by Canton's official city calendar. */
export function parseCantonEventsHtml(
  html: string,
  source: { name: string; url: string; city?: string | null; county?: string | null },
  now = new Date(),
) {
  const $ = cheerio.load(html);
  const events: NormalizedScrapedEvent[] = [];
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);

  $(".list-item, .calendar-item, .event-item, [data-event-id]").each((_, element) => {
    const root = $(element);
    const fullText = cleanText(root.text());
    const dateMatches = [...fullText.matchAll(/\b\d{1,2}\/\d{1,2}\/20\d{2}\s+\d{1,2}:\d{2}\s*(?:AM|PM)\b/gi)];
    const startDateTime = parseEasternDate(dateMatches[0]?.[0] ?? "");
    const rawEnd = parseEasternDate(dateMatches[1]?.[0] ?? "");
    if (!startDateTime || (rawEnd ?? startDateTime) < cutoff) return;

    const titleElement = root.find(".item-title, .event-title, h2, h3, h4").first();
    const detailLink = titleElement.find("a[href]").first().length
      ? titleElement.find("a[href]").first()
      : root.find("a[href*='calendar'], a[href*='event']").last();
    const title = cleanPublicText(titleElement.text() || detailLink.text());
    if (!title) return;

    const description = cleanPublicText(root.find(".description, .item-description, .event-description").first().html()) || null;
    const locationName = cleanText(root.find(".location, .event-location, [data-location]").first().text()) || "City of Canton";
    const address = cleanText(root.find(".address, .event-address, [data-address]").first().text()) || null;
    const categoryText = cleanText(root.find(".category, .event-category").first().text());
    const combinedText = [title, description, locationName, address, categoryText].filter(Boolean).join(" ");
    const originalUrl = toAbsoluteUrl(CANTON_BASE_URL, detailLink.attr("href")) ?? source.url;

    events.push({
      title,
      description,
      startDateTime,
      endDateTime: rawEnd && rawEnd >= startDateTime ? rawEnd : null,
      locationName,
      address,
      city: source.city || "Canton",
      county: source.county || "Cherokee",
      category: inferCategory(combinedText),
      tags: Array.from(new Set(["city event", "official calendar", "City of Canton", "CivicPlus", categoryText].filter(Boolean))),
      cost: /\bfree\b/i.test(combinedText) ? "Free" : null,
      isFree: /\bfree\b/i.test(combinedText),
      isKidFriendly: /\b(kids?|children|child|family|youth|teen)\b/i.test(combinedText),
      isOutdoor: /\b(park|outdoor|festival|concert|market|trail|garden|river)\b/i.test(combinedText),
      sourceName: source.name,
      sourceUrl: source.url,
      originalUrl,
      confidenceScore: 0.95,
      isAllDay: false,
      timeZone: EASTERN_TIME_ZONE,
    });
  });

  return dedupeNormalizedEvents(events);
}

type ExploreCantonListing = {
  url: string;
  dateText: string;
  category: string;
};

type JsonLdEvent = {
  "@type"?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  image?: string | { url?: string };
  eventStatus?: string;
};

export function discoverExploreCantonListings(html: string) {
  const $ = cheerio.load(html);
  const listings: ExploreCantonListing[] = [];

  $("article.card[data-listing]").each((_, element) => {
    const root = $(element);
    const link = root.find(".card__heading a[href]").first();
    const url = toAbsoluteUrl(EXPLORE_CANTON_BASE_URL, link.attr("href"));
    const dateText = cleanText(root.find(".card__date-heading").first().text());
    const category = cleanText(link.attr("data-dms-category-name"));

    if (url && dateText) listings.push({ url, dateText, category });
  });

  return listings;
}

function findJsonLdEvent($: cheerio.CheerioAPI) {
  for (const element of $("script[type='application/ld+json']").toArray()) {
    try {
      const payload = JSON.parse($(element).text()) as JsonLdEvent & { "@graph"?: JsonLdEvent[] };
      const candidates: JsonLdEvent[] = payload["@graph"] ?? [payload];
      const event = candidates.find((candidate) => candidate["@type"] === "Event");
      if (event) return event;
    } catch {
      // Ignore unrelated invalid structured-data blocks.
    }
  }
  return null;
}

function easternParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function occurrenceDate(dateText: string, template: Date, now: Date) {
  const match = cleanText(dateText).match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+([1-9]|[12]\d|3[01])(?:,?\s+(20\d{2}))?$/i,
  );
  if (!match) return null;

  const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const templateParts = easternParts(template);
  const nowParts = easternParts(now);
  let year = match[3] ? Number(match[3]) : Number(nowParts.year);
  const month = monthNames.indexOf(match[1].toLowerCase()) + 1;

  // Calendars commonly show next January in December without printing a year.
  if (!match[3] && month < Number(nowParts.month) - 6) year += 1;

  const parsed = fromZonedTime(
    `${year}-${String(month).padStart(2, "0")}-${match[2].padStart(2, "0")}T${templateParts.hour}:${templateParts.minute}:00`,
    EASTERN_TIME_ZONE,
  );
  if (Number.isNaN(parsed.getTime())) return null;
  const parsedParts = easternParts(parsed);
  if (
    Number(parsedParts.year) !== year ||
    Number(parsedParts.month) !== month ||
    Number(parsedParts.day) !== Number(match[2])
  ) return null;
  return parsed;
}

/** Parse one Explore Canton detail page for the occurrence shown on its listing card. */
export function parseExploreCantonEventDetail(
  html: string,
  listing: ExploreCantonListing,
  source: { name: string; url: string; city?: string | null; county?: string | null },
  now = new Date(),
) {
  const $ = cheerio.load(html);
  const structured = findJsonLdEvent($);
  if (!structured?.startDate || !structured.name) return null;
  if (/EventCancelled$/i.test(structured.eventStatus ?? "")) return null;

  const templateStart = new Date(structured.startDate);
  const templateEnd = structured.endDate ? new Date(structured.endDate) : null;
  if (Number.isNaN(templateStart.getTime())) return null;

  const startDateTime = occurrenceDate(listing.dateText, templateStart, now);
  if (!startDateTime) return null;
  const duration = templateEnd && !Number.isNaN(templateEnd.getTime())
    ? Math.max(0, templateEnd.getTime() - templateStart.getTime())
    : 0;
  const endDateTime = duration ? new Date(startDateTime.getTime() + duration) : null;
  const easternToday = easternParts(now);
  const cutoff = fromZonedTime(
    `${easternToday.year}-${easternToday.month}-${easternToday.day}T00:00:00`,
    EASTERN_TIME_ZONE,
  );
  if ((endDateTime ?? startDateTime) < cutoff) return null;
  const title = cleanPublicText(structured.name);
  const description = cleanPublicText(
    $(".detail__summary .text--content").first().html() ?? structured.description,
  ) || null;
  const addressParts = $(".detail__address span")
    .toArray()
    .map((element) => cleanText($(element).text()))
    .filter(Boolean);
  const locationName = addressParts[0] || "Canton";
  const address = addressParts.length > 1 ? addressParts.join(", ") : null;
  const combinedText = [title, description, locationName, address, listing.category].filter(Boolean).join(" ");
  const imageUrl = typeof structured.image === "string" ? structured.image : structured.image?.url;

  return {
    title,
    description,
    startDateTime,
    endDateTime,
    locationName,
    address,
    city: source.city || "Canton",
    county: source.county || "Cherokee",
    category: inferCategory(combinedText),
    tags: Array.from(new Set(["official tourism calendar", "Explore Canton GA", listing.category].filter(Boolean))),
    cost: /\bfree\b/i.test(combinedText) ? "Free" : null,
    isFree: /\bfree\b/i.test(combinedText),
    isKidFriendly: /\b(kids?|children|child|family|youth|teen)\b/i.test(combinedText),
    isOutdoor: /\b(park|outdoor|festival|concert|market|trail|garden|river|rodeo)\b/i.test(combinedText),
    sourceName: source.name,
    sourceUrl: source.url,
    originalUrl: toAbsoluteUrl(listing.url, structured.url) ?? listing.url,
    imageUrl: imageUrl ?? null,
    confidenceScore: 0.96,
    isAllDay: false,
    timeZone: EASTERN_TIME_ZONE,
  } satisfies NormalizedScrapedEvent;
}

async function fetchExploreCantonHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 (compatible; Common Ground Community Center event importer)",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Explore Canton request failed: ${response.status} ${response.statusText} (${url})`);
  return response.text();
}

async function scrapeExploreCanton(source: Parameters<SourceScraper["scrape"]>[0]) {
  const listings: ExploreCantonListing[] = [];

  for (let page = 1; page <= MAX_EXPLORE_CANTON_PAGES; page += 1) {
    const pageListings = discoverExploreCantonListings(
      await fetchExploreCantonHtml(`${EXPLORE_CANTON_EVENTS_URL}?page=${page}`),
    );
    if (!pageListings.length) break;
    listings.push(...pageListings);
  }

  const uniqueUrls = Array.from(new Set(listings.map((listing) => listing.url)));
  const details = new Map<string, string>();
  const results = await Promise.allSettled(
    uniqueUrls.map(async (url) => [url, await fetchExploreCantonHtml(url)] as const),
  );
  for (const result of results) {
    if (result.status === "fulfilled") details.set(...result.value);
  }

  const events: NormalizedScrapedEvent[] = [];
  for (const listing of listings) {
    const html = details.get(listing.url);
    const event = html ? parseExploreCantonEventDetail(html, listing, source) : null;
    if (event) events.push(event);
  }

  return {
    events: dedupeNormalizedEvents(events),
    failedDetailPages: uniqueUrls.length - details.size,
  };
}

export const cantonOfficialScraper: SourceScraper = {
  sourceName: "Explore Canton events",

  async scrape(source) {
    const { events, failedDetailPages } = await scrapeExploreCanton(source);
    return {
      events,
      status: events.length && !failedDetailPages ? "SUCCESS" : "PARTIAL",
      message: events.length
        ? `Parsed ${events.length} upcoming events from Explore Canton's official tourism calendar${failedDetailPages ? `; ${failedDetailPages} detail pages failed` : ""}.`
        : "The Explore Canton calendar loaded but returned no upcoming events.",
    };
  },
};
