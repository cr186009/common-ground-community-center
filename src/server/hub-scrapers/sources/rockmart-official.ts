
import * as cheerio from "cheerio";

import {
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

const DEFAULT_LOCATION = "City of Rockmart";
const DEFAULT_ADDRESS = "316 N. Piedmont Avenue, Rockmart, GA 30153";

type CalendarContext = {
  month: number;
  year: number;
};

function parseCalendarContext(
  $: cheerio.CheerioAPI,
): CalendarContext {
  const pageText = cleanText($("body").text());

  const monthMatch = pageText.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i,
  );

  if (!monthMatch) {
    const now = new Date();

    return {
      month: now.getMonth(),
      year: now.getFullYear(),
    };
  }

  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  return {
    month: monthNames.indexOf(monthMatch[1].toLowerCase()),
    year: Number(monthMatch[2]),
  };
}

function parseTimeText(value: string) {
  const match = value.match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i,
  );

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3].toLowerCase().replace(/\./g, "");

  if (meridiem === "pm" && hour !== 12) {
    hour += 12;
  }

  if (meridiem === "am" && hour === 12) {
    hour = 0;
  }

  return {
    hour,
    minute,
  };
}

function parseEventLinkText(value: string): {
  title: string;
  month: number | null;
  day: number | null;
  year: number | null;
  timeText: string | null;
} {
  const cleaned = cleanText(value);

  const match = cleaned.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+([1-9]|[12]\d|3[01])(?:,?\s+(20\d{2}))?\s+(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))\s+(.+)$/i,
  );

  if (!match) {
    return {
      title: cleaned,
      month: null,
      day: null,
      year: null,
      timeText: null,
    };
  }

  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  return {
    title: cleanText(match[5]),
    month: monthNames.indexOf(match[1].toLowerCase()),
    day: Number(match[2]),
    year: match[3] ? Number(match[3]) : null,
    timeText: cleanText(match[4]),
  };
}

function createEventDate({
  year,
  month,
  day,
  timeText,
}: {
  year: number;
  month: number;
  day: number;
  timeText?: string | null;
}) {
  const parsedTime = timeText ? parseTimeText(timeText) : null;

  // Use noon when no time is available so the event stays on the
  // intended date even after timezone conversions.
  const hour = parsedTime?.hour ?? 12;
  const minute = parsedTime?.minute ?? 0;

  const date = new Date(year, month, day, hour, minute, 0, 0);

  return Number.isNaN(date.getTime()) ? null : date;
}

function extractDayNumber(
  $: cheerio.CheerioAPI,
  eventLink: any,
) {
  const cell = eventLink.closest("td");

  if (!cell.length) {
    return null;
  }

  const candidates = [
    cell.find(".day, .date, .calendar-day").first().text(),
    cell
      .clone()
      .find("a")
      .remove()
      .end()
      .text(),
    cell.text(),
  ];

  for (const candidate of candidates) {
    const cleaned = cleanText(candidate);
    const match = cleaned.match(/\b([1-9]|[12]\d|3[01])\b/);

    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

function extractLabeledValue(
  $: cheerio.CheerioAPI,
  labels: string[],
) {
  let value: string | null = null;

  $("tr, p, div, li").each((_, element) => {
    if (value) {
      return;
    }

    const text = cleanText($(element).text());

    for (const label of labels) {
      const pattern = new RegExp(
        `^${label}\\s*:?\\s*(.+)$`,
        "i",
      );

      const match = text.match(pattern);

      if (match?.[1]) {
        value = cleanText(match[1]);
        return;
      }
    }
  });

  return value;
}

async function readEventDetails(
  eventUrl: string,
): Promise<{
  description: string | null;
  locationName: string | null;
  address: string | null;
  timeText: string | null;
}> {
  try {
    const html = await fetchSourceHtml(eventUrl);
    const $ = cheerio.load(html);

    const mainContent = $(
      "main, #main-content, #content, .content, .page-content",
    ).first();

    const contentRoot = mainContent.length ? mainContent : $("body");

    const timeText =
      extractLabeledValue($, [
        "Time",
        "Event Time",
        "Start Time",
      ]) ??
      cleanText(
        contentRoot
          .find(".time, .event-time, [class*='time']")
          .first()
          .text(),
      ) ??
      null;

    const locationName =
      extractLabeledValue($, [
        "Location",
        "Event Location",
        "Where",
      ]) ??
      cleanText(
        contentRoot
          .find(".location, .event-location, [class*='location']")
          .first()
          .text(),
      ) ??
      null;

    const address =
      extractLabeledValue($, ["Address", "Event Address"]) ??
      cleanText(
        contentRoot
          .find(".address, .event-address, [class*='address']")
          .first()
          .text(),
      ) ??
      null;

    const descriptionCandidates = contentRoot
      .find(
        ".description, .event-description, .details, .event-details, p",
      )
      .map((_, element) => cleanText($(element).text()))
      .get()
      .filter(
        (text) =>
          text.length >= 25 &&
          !/^contact us/i.test(text) &&
          !/^helpful links/i.test(text) &&
          !/copyright/i.test(text),
      );

    return {
      description: descriptionCandidates[0] ?? null,
      locationName,
      address,
      timeText,
    };
  } catch (error) {
    console.warn(
      `[SCRAPER] Unable to read Rockmart event details: ${eventUrl}`,
      error,
    );

    return {
      description: null,
      locationName: null,
      address: null,
      timeText: null,
    };
  }
}

function isRealCalendarEvent(
  title: string,
  href: string | undefined,
) {
  if (!title || !href) {
    return false;
  }

  if (!/[?&]CNID=\d+/i.test(href)) {
    return false;
  }

  if (
    /^(view more|previous|next|today|show today)$/i.test(
      title,
    )
  ) {
    return false;
  }

  return !/^(public notice!?|adopt-a-trail program|railroad crossing closures)/i.test(
    title,
  );
}
export const rockmartOfficialScraper: SourceScraper = {
  sourceName: "City of Rockmart official site",

  async scrape(source) {
    const calendarUrl = new URL(
      "/CityCalendar.aspx",
      source.url,
    ).toString();

    const html = await fetchSourceHtml(calendarUrl);
    const $ = cheerio.load(html);
    const calendarContext = parseCalendarContext($);

    const eventLinks = $("a[href*='CNID=']")
      .map((_, element) => element)
      .get();

    const events: NormalizedScrapedEvent[] = [];

    for (const element of eventLinks) {
      const link = $(element);
      const rawTitle = cleanText(link.text());
      const href = link.attr("href");
      const parsedLink = parseEventLinkText(rawTitle);
      const title = parsedLink.title;

      if (!isRealCalendarEvent(title, href)) {
        continue;
      }

      const day =
        parsedLink.day ??
        extractDayNumber($, link);

      if (!day) {
        console.warn(
          `[SCRAPER] Rockmart event skipped because its day could not be determined: ${rawTitle}`,
        );
        continue;
      }

      const originalUrl =
        toAbsoluteUrl(calendarUrl, href) ?? calendarUrl;

      const details = await readEventDetails(originalUrl);

      const eventMonth =
        parsedLink.month ??
        calendarContext.month;

      let eventYear =
        parsedLink.year ??
        calendarContext.year;

      // Handle upcoming January events shown during December.
      if (
        parsedLink.year === null &&
        eventMonth < calendarContext.month
      ) {
        eventYear += 1;
      }

      const startDateTime = createEventDate({
        year: eventYear,
        month: eventMonth,
        day,
        timeText:
          details.timeText ??
          parsedLink.timeText,
      });

      if (!startDateTime) {
        console.warn(
          `[SCRAPER] Rockmart event skipped because its date was invalid: ${title}`,
        );
        continue;
      }

      const searchableText = [
        title,
        details.description,
        details.locationName,
      ]
        .filter(Boolean)
        .join(" ");

      events.push({
        title,
        description: details.description,
        startDateTime,
        endDateTime: null,
        locationName:
          details.locationName ?? DEFAULT_LOCATION,
        address: details.address ?? DEFAULT_ADDRESS,
        city: "Rockmart",
        county: "Polk",
        category: inferCategory(searchableText),
        tags: [
          "city source",
          "rockmart",
          "official calendar",
        ],
        cost: null,
        isFree: /\bfree\b/i.test(searchableText),
        isKidFriendly:
          /\bkids?|children|family|youth|community\b/i.test(
            searchableText,
          ),
        isOutdoor:
          /\bpark|lawn|outdoor|downtown|trail\b/i.test(
            searchableText,
          ),
        sourceName: source.name,
        sourceUrl: calendarUrl,
        originalUrl,
        imageUrl: null,
        confidenceScore: details.timeText ? 0.94 : 0.86,
      });
    }

    const dedupedEvents = dedupeNormalizedEvents(events);

    return {
      events: dedupedEvents,
      status:
        eventLinks.length > 0 && dedupedEvents.length === 0
          ? "PARTIAL"
          : "SUCCESS",
      message: `Parsed ${dedupedEvents.length} Rockmart calendar events from ${eventLinks.length} event links.`,
    };
  },
};