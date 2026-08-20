import * as cheerio from "cheerio";
import * as ical from "node-ical";

import {
  cleanText,
  dedupeNormalizedEvents,
  inferCategory,
  toAbsoluteUrl,
} from "@/server/hub-scrapers/helpers";

import type {
  NormalizedScrapedEvent,
  SourceScraper,
} from "@/server/hub-scrapers/types";

const MARIETTA_BASE_URL = "https://www.mariettaga.gov";

const MARIETTA_ICAL_INDEX_URL = `${MARIETTA_BASE_URL}/iCalendar.aspx`;
const MARIETTA_CALENDAR_URL = `${MARIETTA_BASE_URL}/Calendar.aspx`;

const MAX_CALENDAR_FEEDS = 100;
const MAX_FUTURE_MONTHS = 18;

type CalendarFeed = {
  categoryId: string;
  categoryName: string;
  url: string;
};

const MARIETTA_CATEGORY_IDS_ENV = "MARIETTA_CALENDAR_CATEGORY_IDS";

type ParsedICalEvent = {
  type?: string;
  uid?: string | number;
  summary?: string;
  description?: string;
  location?: string;
  start?: Date;
  end?: Date;
  url?: string;
  categories?: string[] | string;
  status?: string;
};

function htmlToPlainText(value?: string | null) {
  if (!value) {
    return "";
  }

  const $ = cheerio.load(`<div>${value}</div>`);

  return cleanText($("div").text());
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function isWithinMariettaImportWindow(
  startDateTime: Date,
  endDateTime?: Date | null,
  now = new Date(),
) {
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const futureCutoff = new Date(cutoff);
  futureCutoff.setMonth(futureCutoff.getMonth() + MAX_FUTURE_MONTHS);

  if (startDateTime > futureCutoff) return false;

  if (endDateTime && endDateTime >= cutoff) {
    return true;
  }

  return startDateTime >= cutoff;
}

function getEasternTimeParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function isPlaceholderEndTime(endDateTime?: Date | null) {
  if (!endDateTime) {
    return false;
  }

  const parts = getEasternTimeParts(endDateTime);

  return parts.hour === 23 && parts.minute === 59;
}

function cleanLocation(value?: string | null) {
  const cleaned = htmlToPlainText(value);

  if (!cleaned) {
    return {
      locationName: "City of Marietta",
      address: null,
    };
  }

  /*
   * CivicPlus locations often look like:
   *
   * City Hall - City Council Chambers -
   * Lobby Level - 205 Lawrence Street -
   * Marietta GA 30060
   *
   * Keep the complete text as the address so no
   * room or building information is lost.
   */
  const parts = cleaned
    .split(/\s+-\s+/)
    .map((part) => cleanText(part))
    .filter(Boolean);

  const locationName = parts[0] || "City of Marietta";

  return {
    locationName,
    address: cleaned,
  };
}

function extractEventUrl(description?: string | null) {
  if (!description) {
    return null;
  }

  const match = description.match(
    /https?:\/\/(?:www\.)?mariettaga\.gov\/calendar\.aspx\?EID=\d+/i,
  );

  return match?.[0] ?? null;
}

function cleanDescription(description?: string | null) {
  if (!description) {
    return null;
  }

  const withoutEventUrl = description.replace(
    /https?:\/\/(?:www\.)?mariettaga\.gov\/calendar\.aspx\?EID=\d+/gi,
    " ",
  );

  const cleaned = htmlToPlainText(withoutEventUrl);

  return cleaned || null;
}

function getCalendarTags(categories?: string[] | string) {
  const values = Array.isArray(categories)
    ? categories
    : categories
      ? [categories]
      : [];

  return Array.from(
    new Set(
      values
        .flatMap((value) => value.split(","))
        .map((value) => cleanText(value))
        .filter(Boolean),
    ),
  );
}

async function fetchText(url: string, accept: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept,
      "accept-language": "en-US,en;q=0.9",
      referer: MARIETTA_ICAL_INDEX_URL,
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      [
        `Marietta request failed: ${response.status} ${response.statusText}`,
        `URL: ${url}`,
        responseText ? `Response: ${responseText.slice(0, 300)}` : null,
      ]
        .filter(Boolean)
        .join(" | "),
    );
  }

  return response.text();
}

export function parseCalendarFeeds(html: string) {
  const $ = cheerio.load(html);

  const feedsByCategoryId = new Map<string, CalendarFeed>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");

    if (!href) {
      return;
    }

    const absoluteUrl = toAbsoluteUrl(MARIETTA_CALENDAR_URL, href);

    if (!absoluteUrl) {
      return;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(absoluteUrl);
    } catch {
      return;
    }

    if (parsedUrl.origin !== MARIETTA_BASE_URL) {
      return;
    }

    const path = parsedUrl.pathname.toLowerCase();
    const isFeed = path.includes("/common/modules/icalendar/icalendar.aspx");
    const isCalendarCategory = path === "/calendar.aspx";

    if (!isFeed && !isCalendarCategory) return;
    if (isFeed && parsedUrl.searchParams.get("feed")?.toLowerCase() !== "calendar") return;

    const categoryId = parsedUrl.searchParams.get(isFeed ? "catID" : "CID");

    if (!categoryId || !/^\d+$/.test(categoryId) || categoryId === "0") {
      return;
    }

    const categoryName = cleanText($(element).text())
      .replace(/\s*\(\d+\)\s*$/, "") || `Calendar ${categoryId}`;

    feedsByCategoryId.set(categoryId, {
      categoryId,
      categoryName,
      url: isFeed
        ? absoluteUrl
        : `${MARIETTA_BASE_URL}/common/modules/iCalendar/iCalendar.aspx?feed=calendar&catID=${categoryId}`,
    });
  });

  const feeds = Array.from(feedsByCategoryId.values()).slice(
    0,
    MAX_CALENDAR_FEEDS,
  );

  console.log(
    `[MARIETTA] Discovered ${feeds.length} CivicPlus calendar feeds.`,
  );

  return feeds;
}

function configuredCalendarFeeds(value = process.env[MARIETTA_CATEGORY_IDS_ENV]) {
  if (!value) {
    return [];
  }

  return Array.from(new Set(value.split(",").map((id) => id.trim())))
    .filter((id) => /^\d+$/.test(id))
    .slice(0, MAX_CALENDAR_FEEDS)
    .map((categoryId) => ({
      categoryId,
      categoryName: `Calendar ${categoryId}`,
      url: `${MARIETTA_BASE_URL}/common/modules/iCalendar/iCalendar.aspx?feed=calendar&catID=${categoryId}`,
    }));
}

export function getConfiguredCalendarFeeds(value?: string) {
  return configuredCalendarFeeds(value);
}

async function discoverCalendarFeeds() {
  console.log("[MARIETTA] Discovering CivicPlus iCalendar feeds.");

  try {
    const html = await fetchText(
      MARIETTA_CALENDAR_URL,
      "text/html,application/xhtml+xml",
    );

    const feeds = parseCalendarFeeds(html);
    if (feeds.length > 0) return feeds;

    // Some CivicPlus deployments expose feed links only on the subscription
    // page. Keep it as a secondary discovery path, not the primary one.
    const subscriptionHtml = await fetchText(
      MARIETTA_ICAL_INDEX_URL,
      "text/html,application/xhtml+xml",
    );
    return parseCalendarFeeds(subscriptionHtml);
  } catch (error) {
    const fallbackFeeds = configuredCalendarFeeds();

    if (fallbackFeeds.length === 0) {
      throw error;
    }

    console.warn(
      `[MARIETTA] Feed discovery failed; using ${fallbackFeeds.length} explicitly configured official CivicPlus feeds from ${MARIETTA_CATEGORY_IDS_ENV}.`,
    );

    return fallbackFeeds;
  }
}

async function fetchCalendarFeed(feed: CalendarFeed) {
  console.log(
    `[MARIETTA] Fetching "${feed.categoryName}" calendar feed (${feed.categoryId}).`,
  );

  const icsText = await fetchText(feed.url, "text/calendar,text/plain,*/*");

  if (!icsText.includes("BEGIN:VCALENDAR")) {
    throw new Error(
      `Marietta calendar ${feed.categoryId} did not return a valid iCalendar document.`,
    );
  }

  const parsed = ical.sync.parseICS(icsText);

  const events: ParsedICalEvent[] = [];

  for (const item of Object.values(parsed)) {
    const event = item as ParsedICalEvent;

    if (event.type !== "VEVENT") {
      continue;
    }

    events.push(event);
  }

  console.log(
    `[MARIETTA] Feed "${feed.categoryName}" returned ${events.length} calendar events.`,
  );

  return events;
}

export const mariettaOfficialScraper: SourceScraper = {
  sourceName: "City of Marietta calendar",

  async scrape(source) {
    const feeds = await discoverCalendarFeeds();

    if (feeds.length === 0) {
      return {
        events: [],
        status: "PARTIAL",
        message:
          "The Marietta iCalendar page loaded, but no calendar feeds were discovered.",
      };
    }

    const feedResults = await Promise.allSettled(
      feeds.map(async (feed) => ({
        feed,
        events: await fetchCalendarFeed(feed),
      })),
    );

    const events: NormalizedScrapedEvent[] = [];

    let successfulFeeds = 0;
    let failedFeeds = 0;
    let skippedOutOfWindowEvents = 0;
    let skippedInvalidEvents = 0;

    /*
     * CivicPlus may publish the same event in
     * multiple category feeds. Track the UID/EID
     * before applying the project's general
     * deduplication helper.
     */
    const seenEventIds = new Set<string>();

    for (const result of feedResults) {
      if (result.status === "rejected") {
        failedFeeds += 1;

        console.warn("[MARIETTA] Calendar feed failed:", result.reason);

        continue;
      }

      successfulFeeds += 1;

      const { feed, events: calendarEvents } = result.value;

      for (const calendarEvent of calendarEvents) {
        const title = cleanText(calendarEvent.summary);

        if (!title) {
          skippedInvalidEvents += 1;
          continue;
        }

        if (!isValidDate(calendarEvent.start)) {
          skippedInvalidEvents += 1;
          continue;
        }

        const startDateTime = calendarEvent.start;

        const rawEndDateTime = isValidDate(calendarEvent.end)
          ? calendarEvent.end
          : null;

        if (!isWithinMariettaImportWindow(startDateTime, rawEndDateTime)) {
          skippedOutOfWindowEvents += 1;
          continue;
        }

        const originalUrl =
          extractEventUrl(calendarEvent.description) ??
          toAbsoluteUrl(MARIETTA_BASE_URL, calendarEvent.url) ??
          source.url;

        const eventIdFromUrl = originalUrl.match(/[?&]EID=(\d+)/i)?.[1];

        const uid = cleanText(String(calendarEvent.uid ?? ""));

        const dedupeId =
          eventIdFromUrl ||
          uid ||
          [title, startDateTime.toISOString(), feed.categoryId].join("|");

        if (seenEventIds.has(dedupeId)) {
          continue;
        }

        seenEventIds.add(dedupeId);

        const description = cleanDescription(calendarEvent.description);

        const { locationName, address } = cleanLocation(calendarEvent.location);

        const platformTags = getCalendarTags(calendarEvent.categories);

        const combinedText = [
          title,
          description,
          locationName,
          address,
          feed.categoryName,
          ...platformTags,
        ]
          .filter(Boolean)
          .join(" ");

        const endDateTime =
          rawEndDateTime &&
          rawEndDateTime >= startDateTime &&
          !isPlaceholderEndTime(rawEndDateTime)
            ? rawEndDateTime
            : null;

        events.push({
          title,
          description,
          startDateTime,
          endDateTime,
          isAllDay:
            getEasternTimeParts(startDateTime).hour === 0 &&
            getEasternTimeParts(startDateTime).minute === 0,
          timeZone: "America/New_York",

          locationName,
          address,

          city: source.city || "Marietta",

          county: source.county || "Cobb",

          category: inferCategory(combinedText),

          tags: Array.from(
            new Set([
              "city event",
              "official calendar",
              "City of Marietta",
              "CivicPlus",
              "iCalendar",
              feed.categoryName,
              ...platformTags,
            ]),
          ),

          cost: /\bfree\b/i.test(combinedText) ? "Free" : null,

          isFree: /\bfree\b/i.test(combinedText),

          isKidFriendly:
            /kids|children|child|family|youth|teen|school|storytime/i.test(
              combinedText,
            ),

          isOutdoor:
            /park|outdoor|festival|concert|market|trail|garden|square|plaza/i.test(
              combinedText,
            ),

          sourceName: source.name,

          sourceUrl: source.url,

          originalUrl,

          imageUrl: null,

          confidenceScore: 0.96,

          dateEvidence: {
            // DTSTART is first-party structured data from the official
            // City of Marietta iCalendar feed.
            structuredDate: startDateTime,
          },
        });
      }
    }

    const dedupedEvents = dedupeNormalizedEvents(events);

    console.log(
      [
        `[MARIETTA] Parsed ${dedupedEvents.length} upcoming events.`,
        `${successfulFeeds} feeds succeeded.`,
        `${failedFeeds} feeds failed.`,
        `${skippedOutOfWindowEvents} out-of-window events skipped.`,
        `${skippedInvalidEvents} invalid events skipped.`,
      ].join(" "),
    );

    return {
      events: dedupedEvents,

      status:
        dedupedEvents.length > 0
          ? failedFeeds > 0
            ? "PARTIAL"
            : "SUCCESS"
          : "PARTIAL",

      message:
        dedupedEvents.length > 0
          ? `Parsed ${dedupedEvents.length} upcoming City of Marietta events from ${successfulFeeds} official CivicPlus iCalendar feeds${
              failedFeeds > 0 ? `; ${failedFeeds} feeds failed` : ""
            }.`
          : `The Marietta calendar loaded, but no upcoming events were detected. ${successfulFeeds} feeds succeeded and ${failedFeeds} failed.`,
    };
  },
};
