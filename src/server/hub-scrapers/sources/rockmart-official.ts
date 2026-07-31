import * as cheerio from "cheerio";

import { parseCommunityDateTime } from "@/lib/hub-date";
import {
  cleanText,
  dedupeNormalizedEvents,
  fetchSourceHtml,
  inferCategory,
} from "@/server/hub-scrapers/helpers";
import type {
  NormalizedScrapedEvent,
  SourceScraper,
} from "@/server/hub-scrapers/types";

const DEFAULT_LOCATION = "City of Rockmart";
const DEFAULT_ADDRESS = "316 N. Piedmont Avenue, Rockmart, GA 30153";
const MAX_DAYS_AHEAD = 400;

function parseOfficialDateTime(value: string) {
  const match = cleanText(value).match(
    /^(\d{1,2})\/(\d{1,2})\/(20\d{2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
  );

  if (!match) {
    return null;
  }

  let hour = Number(match[4]);
  const meridiem = match[6].toUpperCase();

  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  const pad = (part: string | number) => String(part).padStart(2, "0");

  try {
    return parseCommunityDateTime(
      `${match[3]}-${pad(match[1])}-${pad(match[2])}T${pad(hour)}:${match[5]}`,
    );
  } catch {
    return null;
  }
}

function isInImportWindow(value: Date, now: Date) {
  const earliest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const latest = new Date(
    now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000,
  );

  return value >= earliest && value <= latest;
}

/** Parse the event tables embedded by Rockmart's Mimsware calendar page. */
export function parseRockmartCalendarHtml(
  html: string,
  source: { name: string; url: string },
  now = new Date(),
): NormalizedScrapedEvent[] {
  const $ = cheerio.load(html);
  const calendarUrl = new URL("/CityCalendar.aspx", source.url).toString();
  const events: NormalizedScrapedEvent[] = [];

  $("table#tblContentCalendarLayout").each((_, element) => {
    const table = $(element);
    const title = cleanText(
      table.find(".mcms_RendererContentCaption").first().text(),
    );
    const startDateTime = parseOfficialDateTime(
      table.find(".mcms_RendererContentCalendarStartDateTime").first().text(),
    );

    if (!title || !startDateTime || !isInImportWindow(startDateTime, now)) {
      return;
    }

    const parsedEnd = parseOfficialDateTime(
      table.find(".mcms_RendererContentCalendarEndDateTime").first().text(),
    );
    const endDateTime =
      parsedEnd && parsedEnd >= startDateTime ? parsedEnd : null;
    const description =
      cleanText(table.find(".mcms_RendererContentDetail").first().text()) || null;
    const officialLocation =
      cleanText(
        table.find(".mcms_RendererContentCalendarEventLocation").first().text(),
      ) || null;
    const recordId = table.prevAll("a[id]").first().attr("id");
    const originalUrl = recordId
      ? `${calendarUrl}?CNID=${encodeURIComponent(recordId)}`
      : calendarUrl;
    const searchableText = [title, description, officialLocation]
      .filter(Boolean)
      .join(" ");

    events.push({
      title,
      description,
      startDateTime,
      endDateTime,
      locationName: officialLocation ?? DEFAULT_LOCATION,
      address: officialLocation ?? DEFAULT_ADDRESS,
      city: "Rockmart",
      county: "Polk",
      category: inferCategory(searchableText),
      tags: ["city source", "rockmart", "official calendar"],
      cost: null,
      isFree: /\bfree\b/i.test(searchableText),
      isKidFriendly: /\bkids?|children|family|youth|community\b/i.test(
        searchableText,
      ),
      isOutdoor: /\bpark|lawn|outdoor|downtown|trail\b/i.test(
        searchableText,
      ),
      sourceName: source.name,
      sourceUrl: calendarUrl,
      originalUrl,
      imageUrl: null,
      confidenceScore: endDateTime ? 0.98 : 0.94,
      isAllDay: false,
      timeZone: "America/New_York",
    });
  });

  return dedupeNormalizedEvents(events);
}

export const rockmartOfficialScraper: SourceScraper = {
  sourceName: "City of Rockmart official site",

  async scrape(source) {
    const calendarUrl = new URL("/CityCalendar.aspx", source.url).toString();
    const html = await fetchSourceHtml(calendarUrl);
    const events = parseRockmartCalendarHtml(html, source);

    return {
      events,
      status: events.length > 0 ? "SUCCESS" : "PARTIAL",
      message: `Parsed ${events.length} current Rockmart events from the official embedded calendar records.`,
    };
  },
};
