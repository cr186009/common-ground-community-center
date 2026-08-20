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
    const parsed = parseCommunityDateTime(
      `${match[3]}-${pad(match[1])}-${pad(match[2])}T${pad(hour)}:${match[5]}`,
    );
    const easternParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(parsed);
    const parts = Object.fromEntries(easternParts.map((part) => [part.type, part.value]));

    if (
      Number(parts.year) !== Number(match[3]) ||
      Number(parts.month) !== Number(match[1]) ||
      Number(parts.day) !== Number(match[2]) ||
      Number(parts.hour) !== hour ||
      Number(parts.minute) !== Number(match[5])
    ) return null;

    return parsed;
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

  $("a.mcms_Calendar_Day_Item").each((_, element) => {
    const link = $(element);
    const dayCellId = link.closest("td[id]").attr("id") ?? "";
    const dateMatch = dayCellId.match(/_(20\d{2})_(\d{1,2})_(\d{1,2})_[01]$/);
    const metadata = cleanText(link.attr("title"));
    const timeMatch = metadata.match(
      /^(\d{1,2}:\d{2}\s*(?:AM|PM))(?:\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM)))?/i,
    );
    const title = cleanText(link.text());

    if (!dateMatch || !timeMatch || !title) return;

    const date = `${dateMatch[2]}/${dateMatch[3]}/${dateMatch[1]}`;
    const startDateTime = parseOfficialDateTime(`${date} ${timeMatch[1]}`);
    if (!startDateTime || !isInImportWindow(startDateTime, now)) return;

    const parsedEnd = timeMatch[2]
      ? parseOfficialDateTime(`${date} ${timeMatch[2]}`)
      : null;
    const endDateTime = parsedEnd && parsedEnd >= startDateTime ? parsedEnd : null;
    const officialLocation = cleanText(
      metadata.match(/\bEvent Location:\s*(.+)$/i)?.[1],
    ) || null;
    const href = link.attr("href");
    const recordId = href
      ? new URL(href, calendarUrl).searchParams.get("CNID")
      : null;
    const originalUrl = recordId
      ? `${calendarUrl}?CNID=${encodeURIComponent(recordId)}`
      : calendarUrl;
    const searchableText = [title, officialLocation].filter(Boolean).join(" ");

    events.push({
      title,
      description: null,
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
      isKidFriendly: /\bkids?|children|family|youth|community\b/i.test(searchableText),
      isOutdoor: /\bpark|lawn|outdoor|downtown|trail\b/i.test(searchableText),
      sourceName: source.name,
      sourceUrl: calendarUrl,
      originalUrl,
      imageUrl: null,
      confidenceScore: endDateTime ? 0.96 : 0.92,
      isAllDay: false,
      timeZone: "America/New_York",
    });
  });

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
      message: `Parsed ${events.length} current Rockmart events from the official calendar.`,
    };
  },
};
