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

export const cedartownDowntownScraper: SourceScraper = {
  sourceName: "Downtown Cedartown events page",
  async scrape(source) {
    const html = await fetchSourceHtml(source.url);
    const $ = cheerio.load(html);
    const events = $(".sqs-events-collection-item, .eventlist-event, article, li")
      .map((_, element) => {
        const title = cleanText($(element).find("h1, h2, h3, a").first().text());
        const dateText = cleanText($(element).find("time, .date, .event-date").first().text());
        const timeText = cleanText($(element).find(".time, .event-time").first().text());
        const description = cleanText($(element).find("p, .summary, .event-description").first().text()) || null;
        const location = cleanText($(element).find(".location").first().text()) || "Downtown Cedartown";
        const href = $(element).find("a").first().attr("href");

        if (!title) {
          return null;
        }

        const parsedDate = parseLooseDate(dateText) || (dateText ? parsePartialDateWithYear(dateText, timeText) : null);
        if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
          return null;
        }

        return {
          title,
          description,
          startDateTime: parsedDate,
          locationName: location,
          address: null,
          city: "Cedartown",
          county: "Polk",
          category: inferCategory(`${title} ${description ?? ""}`),
          tags: ["downtown"],
          cost: null,
          isFree: /free/i.test(`${title} ${description ?? ""}`),
          isKidFriendly: /kids|family|children/i.test(`${title} ${description ?? ""}`),
          isOutdoor: /park|downtown|outdoor|square/i.test(`${title} ${description ?? ""}`),
          sourceName: source.name,
          sourceUrl: source.url,
          originalUrl: toAbsoluteUrl(source.url, href) ?? source.url,
          confidenceScore: 0.8,
        };
      })
      .get()
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    return {
      events: dedupeNormalizedEvents(events),
      status: "SUCCESS",
      message: `Parsed ${events.length} Cedartown downtown items.`,
    };
  },
};
