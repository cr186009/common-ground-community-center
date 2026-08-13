import * as cheerio from "cheerio";

import {
  cleanText,
  dedupeNormalizedEvents,
  fetchSourceHtml,
  inferCategory,
  parseLooseDate,
  parsePartialDateWithYear,
  toAbsoluteUrl,
} from "@/server/hub-scrapers/helpers";
import type { SourceScraper } from "@/server/hub-scrapers/types";

type CedartownSource = Pick<Parameters<SourceScraper["scrape"]>[0], "name" | "url" | "city" | "county">;

export function parseCedartownEvents(html: string, source: CedartownSource) {
  const $ = cheerio.load(html);
  const events = $(".sqs-events-collection-item, .eventlist-event, article")
    .map((_, element) => {
      const title = cleanText($(element).find("h1, h2, h3, .eventlist-title, a").first().text());
      const dateText = cleanText($(element).find("time, .date, .event-date, .eventlist-meta-date").first().text());
      const timeText = cleanText($(element).find(".time, .event-time, .eventlist-meta-time").first().text());
      const description = cleanText($(element).find("p, .summary, .event-description, .eventlist-description").first().text()) || null;
      const location = cleanText($(element).find(".location, .eventlist-meta-address").first().text()) || "Downtown Cedartown";
      const href = $(element).find("a[href]").first().attr("href");

      if (!title || !dateText) return null;

      // Prefer the combined visible date/time. The old parser accepted the date
      // first and silently discarded a separately rendered event time.
      const combinedText = cleanText(`${dateText} ${timeText}`);
      const parsedDate = parseLooseDate(combinedText) || parseLooseDate(dateText) || parsePartialDateWithYear(dateText, timeText);
      if (!parsedDate || Number.isNaN(parsedDate.getTime())) return null;

      return {
        title,
        description,
        startDateTime: parsedDate,
        locationName: location,
        address: null,
        city: source.city || "Cedartown",
        county: source.county || "Polk",
        category: inferCategory(`${title} ${description ?? ""}`),
        tags: ["downtown", "official calendar"],
        cost: null,
        isFree: /free/i.test(`${title} ${description ?? ""}`),
        isKidFriendly: /kids|family|children/i.test(`${title} ${description ?? ""}`),
        isOutdoor: /park|downtown|outdoor|square/i.test(`${title} ${description ?? ""}`),
        sourceName: source.name,
        sourceUrl: source.url,
        originalUrl: toAbsoluteUrl(source.url, href) ?? source.url,
        confidenceScore: 0.85,
        timeZone: "America/New_York",
        dateEvidence: {
          listingDate: parsedDate,
          sourcePublishedText: combinedText,
        },
      };
    })
    .get()
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return dedupeNormalizedEvents(events);
}

export const cedartownDowntownScraper: SourceScraper = {
  sourceName: "Downtown Cedartown events page",
  async scrape(source) {
    const html = await fetchSourceHtml(source.url);
    const events = parseCedartownEvents(html, source);

    return {
      events,
      status: events.length > 0 ? "SUCCESS" : "PARTIAL",
      message: events.length > 0
        ? `Parsed ${events.length} Cedartown downtown items.`
        : "The official Downtown Cedartown page loaded, but it did not publish any machine-readable dated event cards.",
    };
  },
};
