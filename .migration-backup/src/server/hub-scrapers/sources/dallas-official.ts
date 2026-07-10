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

export const dallasOfficialScraper: SourceScraper = {
  sourceName: "City of Dallas official events page",
  async scrape(source) {
    const html = await fetchSourceHtml(source.url);
    const $ = cheerio.load(html);
    const selectors = [".views-row", "article", ".event", "li", ".item"];
    const events = selectors
      .flatMap((selector) =>
        $(selector)
          .map((_, element) => {
            const title = cleanText($(element).find("h2, h3, a").first().text());
            const dateText = cleanText($(element).find("time, .date, .field--name-field-date").first().text());
            const description = cleanText($(element).find("p, .summary, .field--name-body").first().text()) || null;
            const location = cleanText($(element).find(".location, .field--name-field-location").first().text()) || null;
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
              city: "Dallas",
              county: "Paulding",
              category: inferCategory(`${title} ${description ?? ""}`),
              tags: ["city event"],
              cost: null,
              isFree: /free/i.test(`${title} ${description ?? ""}`),
              isKidFriendly: /kids|family|children/i.test(`${title} ${description ?? ""}`),
              isOutdoor: /park|outdoor|square|downtown/i.test(`${title} ${description ?? ""}`),
              sourceName: source.name,
              sourceUrl: source.url,
              originalUrl: toAbsoluteUrl(source.url, href) ?? source.url,
              confidenceScore: 0.82,
            };
          })
          .get()
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
      )
      .slice(0, 30);

    return {
      events: dedupeNormalizedEvents(events),
      status: "SUCCESS",
      message: `Parsed ${events.length} possible Dallas event entries.`,
    };
  },
};
