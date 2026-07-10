import * as cheerio from "cheerio";

import {
  cleanText,
  dedupeNormalizedEvents,
  fetchSourceHtml,
  inferCategory,
  parseLooseDate,
  toAbsoluteUrl,
} from "@/server/hub-scrapers/helpers";
import type { SourceScraper } from "@/server/hub-scrapers/types";

export const pauldingCalendarScraper: SourceScraper = {
  sourceName: "Paulding County Parks calendar",
  async scrape(source) {
    const html = await fetchSourceHtml(source.url);
    const $ = cheerio.load(html);
    const events = $(".calendarlist li, .calendarItem, .listItem, .event, tr")
      .map((_, element) => {
        const title = cleanText($(element).find("a, .summary, .title").first().text());
        const dateText = cleanText($(element).find("time, .date, .datetime, .calendarDate").first().text());
        const description = cleanText($(element).find("p, .description").first().text()) || null;
        const location = cleanText($(element).find(".location, .calendarLocation").first().text()) || null;
        const href = $(element).find("a").first().attr("href");
        const parsedDate = parseLooseDate(dateText);

        if (!title || !parsedDate) {
          return null;
        }

        return {
          title,
          description,
          startDateTime: parsedDate,
          locationName: location,
          address: null,
          city: "Paulding County",
          county: "Paulding",
          category: inferCategory(`${title} ${description ?? ""}`),
          tags: ["parks", "community calendar"],
          cost: null,
          isFree: /free/i.test(`${title} ${description ?? ""}`),
          isKidFriendly: /kids|family|children/i.test(`${title} ${description ?? ""}`),
          isOutdoor: /park|trail|outdoor/i.test(`${title} ${description ?? ""}`),
          sourceName: source.name,
          sourceUrl: source.url,
          originalUrl: toAbsoluteUrl(source.url, href) ?? source.url,
          confidenceScore: 0.83,
        };
      })
      .get()
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    return {
      events: dedupeNormalizedEvents(events),
      status: "SUCCESS",
      message: `Parsed ${events.length} calendar items from the Paulding calendar.`,
    };
  },
};
