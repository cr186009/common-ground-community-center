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

const GALLERY_PATH = "/RCACArtGallery.aspx";
const DEFAULT_LOCATION = "Rockmart Cultural Arts Center";
const DEFAULT_ADDRESS = "316 N. Piedmont Ave., Building 300, Rockmart, GA 30153";
const MAX_DAYS_AHEAD = 400;
const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};
const MONTH_PATTERN = Object.keys(MONTHS)
  .map((month) => `${month[0].toUpperCase()}${month.slice(1)}`)
  .join("|");
const RANGE_PATTERN = new RegExp(
  `(${MONTH_PATTERN})\\s+(\\d{1,2})\\s*[-–—]\\s*(${MONTH_PATTERN})\\s+(\\d{1,2}),\\s*(20\\d{2})`,
  "i",
);
const TIMED_PATTERN = new RegExp(
  `(${MONTH_PATTERN})\\s+(\\d{1,2}),?\\s*(20\\d{2})?\\s*[-–—]\\s*(\\d{1,2})(?::(\\d{2}))?\\s*(?:[-–—]\\s*(\\d{1,2})(?::(\\d{2}))?\\s*)?(am|pm)`,
  "i",
);

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseCivilDate(
  monthName: string,
  day: string,
  year: string,
  hour = 0,
  minute = 0,
) {
  const month = MONTHS[monthName.toLowerCase()];
  const numericDay = Number(day);
  const numericYear = Number(year);
  const validation = new Date(Date.UTC(numericYear, month - 1, numericDay));

  if (
    !month ||
    validation.getUTCFullYear() !== numericYear ||
    validation.getUTCMonth() !== month - 1 ||
    validation.getUTCDate() !== numericDay
  ) {
    return null;
  }

  try {
    return parseCommunityDateTime(
      `${numericYear}-${pad(month)}-${pad(numericDay)}T${pad(hour)}:${pad(minute)}`,
    );
  } catch {
    return null;
  }
}

function isRangeInImportWindow(start: Date, end: Date, now: Date) {
  const earliestEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const latestStart = new Date(
    now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000,
  );
  return end >= earliestEnd && start <= latestStart;
}

function isInstantInImportWindow(value: Date, now: Date) {
  return isRangeInImportWindow(value, value, now);
}

function contentLines(html: string) {
  const $ = cheerio.load(html);
  const detail = $(".mcms_RendererContentDetail").first();
  if (!detail.length) return [];

  detail.find("br").replaceWith("\n");
  detail.find("p, article, li").each((_, element) => {
    $(element).append("\n");
  });

  return detail
    .text()
    .replace(/\u00a0/g, " ")
    .split(/\n+/)
    .map((line) => cleanText(line))
    .filter(Boolean);
}

function titleForRange(lines: string[], lineIndex: number, matchIndex: number) {
  const prefix = cleanText(lines[lineIndex].slice(0, matchIndex)).replace(/[:\-–—]+$/, "");
  if (/\bexhibit\b/i.test(prefix)) return prefix;

  const candidates: string[] = [];
  for (let index = lineIndex - 1; index >= Math.max(0, lineIndex - 3); index -= 1) {
    const line = lines[index];
    if (RANGE_PATTERN.test(line) || /\breception\b|festival|gallery hours/i.test(line)) break;
    candidates.unshift(line);
    if (/\bexhibit\b/i.test(line)) break;
  }

  const title = cleanText(candidates.join(" ")).replace(/[:\-–—]+$/, "");
  return /\bexhibit\b/i.test(title) && !/^RCAC Art Exhibits?$/i.test(title)
    ? title
    : "RCAC Art Exhibit";
}

function eventBase(
  source: { name: string; url: string },
  galleryUrl: string,
  title: string,
  description: string | null,
) {
  const searchableText = [title, description].filter(Boolean).join(" ");
  return {
    title,
    description,
    locationName: DEFAULT_LOCATION,
    address: DEFAULT_ADDRESS,
    city: "Rockmart",
    county: "Polk",
    category: inferCategory(searchableText),
    tags: ["arts and culture", "rockmart", "official calendar", "rcac"] as string[],
    cost: /\bfree admission\b/i.test(searchableText) ? "Free" : null,
    isFree: /\bfree admission\b/i.test(searchableText),
    isKidFriendly: /\bchildren|kids?|family|youth\b/i.test(searchableText),
    isOutdoor: false,
    sourceName: source.name,
    sourceUrl: galleryUrl,
    originalUrl: galleryUrl,
    imageUrl: null,
    timeZone: "America/New_York",
  };
}

/** Parse the official RCAC gallery's dated exhibits, receptions, and festivals. */
export function parseRockmartCulturalArtsHtml(
  html: string,
  source: { name: string; url: string },
  now = new Date(),
): NormalizedScrapedEvent[] {
  const lines = contentLines(html);
  const galleryUrl = new URL(GALLERY_PATH, source.url).toString();
  const events: NormalizedScrapedEvent[] = [];
  let mostRecentYear: string | null = null;
  let mostRecentExhibit: string | null = null;

  lines.forEach((line, lineIndex) => {
    const rangeMatch = RANGE_PATTERN.exec(line);
    if (rangeMatch) {
      const [, startMonth, startDay, endMonth, endDay, year] = rangeMatch;
      const startDateTime = parseCivilDate(startMonth, startDay, year);
      const endDateTime = parseCivilDate(endMonth, endDay, year, 23, 59);
      const title = titleForRange(lines, lineIndex, rangeMatch.index);

      mostRecentYear = year;
      mostRecentExhibit = title;
      if (!startDateTime || !endDateTime || !isRangeInImportWindow(startDateTime, endDateTime, now)) {
        return;
      }

      events.push({
        ...eventBase(
          source,
          galleryUrl,
          title,
          "Official RCAC gallery exhibit. Free admission during posted gallery hours.",
        ),
        startDateTime,
        endDateTime,
        category: "OTHER",
        cost: "Free",
        isFree: true,
        confidenceScore: title === "RCAC Art Exhibit" ? 0.82 : 0.96,
        isAllDay: true,
      });
    }

    if (!/\breception\b|festival|open house/i.test(line)) return;
    const timedMatch = TIMED_PATTERN.exec(line);
    if (!timedMatch) return;

    const [, month, day, explicitYear, startHourText, startMinuteText, endHourText, endMinuteText, meridiem] = timedMatch;
    const year = explicitYear ?? mostRecentYear;
    if (!year) return;

    const toHour = (value: string) => {
      let hour = Number(value);
      if (meridiem.toLowerCase() === "pm" && hour !== 12) hour += 12;
      if (meridiem.toLowerCase() === "am" && hour === 12) hour = 0;
      return hour;
    };
    const startDateTime = parseCivilDate(
      month,
      day,
      year,
      toHour(startHourText),
      Number(startMinuteText ?? 0),
    );
    if (!startDateTime || !isInstantInImportWindow(startDateTime, now)) return;

    const parsedEnd = endHourText
      ? parseCivilDate(
          month,
          day,
          year,
          toHour(endHourText),
          Number(endMinuteText ?? 0),
        )
      : null;
    const endDateTime = parsedEnd && parsedEnd > startDateTime ? parsedEnd : null;
    const isFestival = /festival/i.test(line);
    const isAwardCeremony = /award ceremony/i.test(line);
    const title = isFestival
      ? "RCAC Indoor Holiday Festival, Reception & Open House"
      : `${mostRecentExhibit ?? "RCAC Art Exhibit"} ${isAwardCeremony ? "Reception & Award Ceremony" : "Reception"}`;

    events.push({
      ...eventBase(source, galleryUrl, title, line),
      startDateTime,
      endDateTime,
      category: isFestival ? "FESTIVAL" : "OTHER",
      isKidFriendly: isFestival || /children|family|kids?/i.test(title),
      confidenceScore: endDateTime ? 0.96 : 0.9,
      isAllDay: false,
    });
  });

  return dedupeNormalizedEvents(events);
}

export const rockmartCulturalArtsScraper: SourceScraper = {
  sourceName: "Rockmart Cultural Arts Center",

  async scrape(source) {
    const galleryUrl = new URL(GALLERY_PATH, source.url).toString();
    const html = await fetchSourceHtml(galleryUrl);
    const events = parseRockmartCulturalArtsHtml(html, source);

    return {
      events,
      status: events.length > 0 ? "SUCCESS" : "PARTIAL",
      message: `Parsed ${events.length} current RCAC exhibits and special events from the official gallery page.`,
    };
  },
};
