import * as cheerio from "cheerio";

import { parseCommunityDateTime } from "@/lib/hub-date";
import {
  cleanPublicText,
  cleanText,
  dedupeNormalizedEvents,
  fetchSourceHtml,
  inferCategory,
  toAbsoluteUrl,
} from "@/server/hub-scrapers/helpers";
import type {
  NormalizedScrapedEvent,
  SourceScraper,
} from "@/server/hub-scrapers/types";

const CALENDAR_URL = "https://business.polkgeorgia.com/events";
const MAX_DAYS_AHEAD = 400;

type ChamberListItem = {
  title: string;
  startDateTime: Date;
  endDateTime: Date | null;
  originalUrl: string;
  imageUrl: string | null;
  categories: string[];
};

function parseEasternIso(value: string) {
  if (!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  try {
    return parseCommunityDateTime(value);
  } catch {
    return null;
  }
}

function isInImportWindow(value: Date, now: Date) {
  const earliest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const latest = new Date(now.getTime() + MAX_DAYS_AHEAD * 86_400_000);
  return value >= earliest && value <= latest;
}

/** Parse GrowthZone's server-rendered event cards. */
export function parsePolkChamberListHtml(
  html: string,
  now = new Date(),
): ChamberListItem[] {
  const $ = cheerio.load(html);

  return $(".gz-events-card")
    .map((_, element) => {
      const card = $(element);
      const link = card.find(".gz-card-title a[href]").first();
      const title = cleanText(link.text());
      const originalUrl = toAbsoluteUrl(CALENDAR_URL, link.attr("href"));
      const startValue = card.find(".gz-card-date [content]").first().attr("content");
      const endValue = card.find(".gz-card-date meta[content]").first().attr("content");
      const startDateTime = startValue ? parseEasternIso(startValue) : null;
      const parsedEnd = endValue ? parseEasternIso(endValue) : null;

      if (!title || !originalUrl || !startDateTime || !isInImportWindow(startDateTime, now)) {
        return null;
      }

      return {
        title,
        startDateTime,
        endDateTime: parsedEnd && parsedEnd >= startDateTime ? parsedEnd : null,
        originalUrl,
        imageUrl: toAbsoluteUrl(CALENDAR_URL, card.find("img.gz-events-img").attr("src")) ?? null,
        categories: card.find(".gz-cat").map((__, category) => cleanText($(category).text())).get(),
      };
    })
    .get()
    .filter((item): item is ChamberListItem => Boolean(item));
}

/** Enrich a GrowthZone list item from its detail page. */
export function parsePolkChamberDetailHtml(
  html: string,
  item: ChamberListItem,
  source: { name: string; url: string },
): NormalizedScrapedEvent {
  const $ = cheerio.load(html);
  const main = $("main, #gz-details, .gz-event-details, article").first();
  const scope = main.length ? main : $("body");
  const fullText = cleanText(scope.text());
  const heading = scope.find("h1").first();
  const descriptionParts = heading
    .nextUntil("h1, h2, h3, h4, h5, h6, form, .gz-details-form, .gz-event-date, .gz-event-location")
    .map((_, element) => $(element).html() ?? $(element).text())
    .get()
    .join("\n");
  const description = cleanPublicText(descriptionParts) || null;
  const locationHeading = $("h1, h2, h3, h4, h5, h6").filter((_, element) =>
    /^location$/i.test(cleanText($(element).text())),
  ).first();
  const headingLocationText = cleanText(cleanPublicText(
    locationHeading
      .nextUntil("h1, h2, h3, h4, h5, h6")
      .map((_, element) => $(element).html() ?? $(element).text())
      .get()
      .join("\n"),
  ));
  const locationText = headingLocationText || cleanText(
    fullText.match(
      /\bLocation\b\s+(.+?)(?=\b(?:Website|Contact Information|Fees|Date and Time|Set a Reminder)\b|$)/i,
    )?.[1],
  );
  const cityMatch = `${locationText} ${fullText} ${html}`.match(
    /\b(Rockmart|Cedartown)\b/i,
  );
  const titleCityMatch = item.title.match(/\b(Rockmart|Cedartown)\b/i);
  const city = cityMatch?.[1] ?? titleCityMatch?.[1] ?? "Polk County";
  const normalizedCity = city === "Polk County"
    ? city
    : `${city[0].toUpperCase()}${city.slice(1).toLowerCase()}`;
  const searchableText = [item.title, description, locationText, item.categories.join(" ")]
    .filter(Boolean)
    .join(" ");

  return {
    title: item.title,
    description,
    startDateTime: item.startDateTime,
    endDateTime: item.endDateTime,
    locationName: locationText || null,
    address: locationText || null,
    city: normalizedCity,
    county: "Polk",
    category: inferCategory(searchableText),
    tags: ["chamber", "polk county", ...item.categories.map((value) => value.toLowerCase())],
    cost: /\bfree\b/i.test(fullText) ? "Free" : null,
    isFree: /\bfree\b/i.test(fullText),
    isKidFriendly: /\bfamil(?:y|ies)|kids?|children|youth\b/i.test(searchableText),
    isOutdoor: /\bpark|trail|outdoor|downtown|square\b/i.test(searchableText),
    sourceName: source.name,
    sourceUrl: source.url,
    originalUrl: item.originalUrl,
    imageUrl: item.imageUrl,
    confidenceScore: locationText ? 0.94 : 0.86,
    isAllDay: false,
    timeZone: "America/New_York",
  };
}

export const polkChamberScraper: SourceScraper = {
  sourceName: "Polk County Chamber events",

  async scrape(source) {
    const calendarUrl = new URL("/events", source.url).toString();
    const listHtml = await fetchSourceHtml(calendarUrl);
    const items = parsePolkChamberListHtml(listHtml);
    const events = await Promise.all(
      items.map(async (item) =>
        parsePolkChamberDetailHtml(await fetchSourceHtml(item.originalUrl), item, {
          name: source.name,
          url: calendarUrl,
        })),
    );
    const deduped = dedupeNormalizedEvents(events);

    return {
      events: deduped,
      status: deduped.length ? "SUCCESS" : "PARTIAL",
      message: `Parsed ${deduped.length} current Polk County Chamber events.`,
    };
  },
};
