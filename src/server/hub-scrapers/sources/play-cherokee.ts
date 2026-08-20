import * as cheerio from "cheerio";
import { fromZonedTime } from "date-fns-tz";

import { cleanPublicText, cleanText, dedupeNormalizedEvents, inferCategory, toAbsoluteUrl } from "@/server/hub-scrapers/helpers";
import type { NormalizedScrapedEvent, SourceScraper } from "@/server/hub-scrapers/types";

const API_URL = "https://playcherokee.org/wp-json/tribe/events/v1/events";
const TIME_ZONE = "America/New_York";

type TribeVenue = { venue?: string; address?: string; city?: string; state?: string; province?: string; zip?: string };
type TribeEvent = {
  id?: number; title?: string; description?: string; excerpt?: string; url?: string;
  start_date?: string; end_date?: string; all_day?: boolean; cost?: string;
  image?: { url?: string } | false | null; categories?: Array<{ name?: string }>;
  venue?: TribeVenue | [] | false | null; status?: string; hide_from_listings?: boolean;
};
type TribeResponse = { events?: TribeEvent[]; next_rest_url?: string | null; total_pages?: number };

function localDate(value?: string) {
  if (!value) return null;
  const parsed = fromZonedTime(value.replace(" ", "T"), TIME_ZONE);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function plainHtml(value?: string) {
  if (!value) return "";
  return cleanPublicText(cheerio.load(`<div>${value}</div>`)("div").text());
}

export function parsePlayCherokeeResponse(payload: TribeResponse, source: { name: string; url: string }, now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCHours(0, 0, 0, 0);
  const events: NormalizedScrapedEvent[] = [];

  for (const item of payload.events ?? []) {
    if (item.hide_from_listings || item.status && item.status !== "publish") continue;
    const venue = item.venue && !Array.isArray(item.venue) ? item.venue : null;
    // This countywide source belongs in the Canton profile only when its official venue says Canton.
    if (cleanText(venue?.city).toLowerCase() !== "canton") continue;
    const startDateTime = localDate(item.start_date);
    const endDateTime = localDate(item.end_date);
    const title = cleanPublicText(item.title);
    if (!title || !startDateTime || (endDateTime ?? startDateTime) < cutoff) continue;
    const description = plainHtml(item.description ?? item.excerpt) || null;
    const address = [cleanText(venue?.address), [cleanText(venue?.city), cleanText(venue?.state ?? venue?.province), cleanText(venue?.zip)].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null;
    const tags = Array.from(new Set(["Cherokee Recreation & Parks", "official recreation calendar", ...(item.categories ?? []).map((x) => cleanText(x.name)).filter(Boolean)]));
    const combined = [title, description, venue?.venue, address, ...tags].filter(Boolean).join(" ");
    const isFree = /\bfree\b/i.test(item.cost ?? "") || /^\$?0(?:\.00)?$/.test(cleanText(item.cost));
    events.push({
      title, description, startDateTime, endDateTime: endDateTime && endDateTime >= startDateTime ? endDateTime : null,
      locationName: cleanText(venue?.venue) || "Cherokee Recreation & Parks", address, city: "Canton", county: "Cherokee",
      category: inferCategory(combined), tags, cost: isFree ? "Free" : cleanText(item.cost) || null, isFree,
      isKidFriendly: /\b(kids?|children|child|family|youth|teen)\b/i.test(combined),
      isOutdoor: /\b(park|outdoor|pool|aquatic|festival|5k|trail)\b/i.test(combined),
      sourceName: source.name, sourceUrl: source.url, originalUrl: toAbsoluteUrl(source.url, item.url) ?? `${source.url}#event-${item.id}`,
      imageUrl: item.image && item.image.url ? toAbsoluteUrl(source.url, item.image.url) : null,
      confidenceScore: 0.96, isAllDay: item.all_day === true, timeZone: TIME_ZONE,
      dateEvidence: { listingDate: item.start_date?.slice(0, 10), structuredDate: startDateTime.toISOString(), sourcePublishedText: [item.start_date && `Official start: ${item.start_date}`, item.end_date && `Official end: ${item.end_date}`, item.all_day && "All-day event"].filter(Boolean).join("; ") },
    });
  }
  return dedupeNormalizedEvents(events);
}

async function fetchPage(url: string) {
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "Common Ground Community Center event importer" }, cache: "no-store" });
  if (!response.ok) throw new Error(`Play Cherokee request failed: ${response.status} ${response.statusText}`);
  return response.json() as Promise<TribeResponse>;
}

export const playCherokeeScraper: SourceScraper = {
  sourceName: "Cherokee Recreation & Parks events",
  async scrape(source) {
    const found: NormalizedScrapedEvent[] = [];
    let next: string | null = `${API_URL}?per_page=50`;
    let pages = 0;
    while (next && pages < 20) {
      const payload = await fetchPage(next);
      found.push(...parsePlayCherokeeResponse(payload, source));
      next = payload.next_rest_url ?? null;
      pages += 1;
    }
    const events = dedupeNormalizedEvents(found);
    return { events, status: events.length ? "SUCCESS" : "PARTIAL", message: events.length ? `Parsed ${events.length} Canton events from Play Cherokee's official calendar.` : "Play Cherokee loaded but returned no upcoming events with a verified Canton venue." };
  },
};
