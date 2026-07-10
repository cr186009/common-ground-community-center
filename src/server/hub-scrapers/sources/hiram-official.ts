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

export const hiramOfficialScraper: SourceScraper = {
  sourceName: "City of Hiram official site",
  async scrape(source) {
    const html = await fetchSourceHtml(source.url);
    const $ = cheerio.load(html);
    const events = $("article, .news-item, .event, li")
      .map((_, element) => {
        const title = cleanText($(element).find("h2, h3, a").first().text());
        const dateText = cleanText($(element).find("time, .date, .event-date").first().text());
        const timeText = cleanText($(element).find(".time, .event-time").first().text());
        const description = cleanText($(element).find("p, .summary, .excerpt").first().text()) || null;
        const location = cleanText($(element).find(".location").first().text()) || "Hiram City Hall";
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
          city: "Hiram",
          county: "Paulding",
          category: inferCategory(`${title} ${description ?? ""}`),
          tags: ["city source"],
          cost: null,
          isFree: true,
          isKidFriendly: /kids|family|community/i.test(`${title} ${description ?? ""}`),
          isOutdoor: /park|cleanup|outdoor/i.test(`${title} ${description ?? ""}`),
          sourceName: source.name,
          sourceUrl: source.url,
          originalUrl: toAbsoluteUrl(source.url, href) ?? source.url,
          confidenceScore: 0.78,
        };
      })
      .get()
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    return {
      events: dedupeNormalizedEvents(events),
      status: events.length > 0 ? "SUCCESS" : "PARTIAL",
      message:
        events.length > 0
          ? `Parsed ${events.length} Hiram items.`
          : "No structured Hiram event entries were detected; manual review may be needed.",
    };
  },
};
