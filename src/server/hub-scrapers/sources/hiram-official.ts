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

type HiramCalendarItem = {
  id?: string;
  rid?: string;
  title?: string;
  primary_calendar_name?: string;
  calendar_displays?: string[];
  start?: string;
  end?: string;
  url?: string;
  location?: string;
  image?: string;
  desc?: string;
  rrule?: string;
  color?: string;
};

function buildCalendarFeedUrl(sourceUrl: string) {
  const source = new URL(sourceUrl);

  const feedUrl = new URL(
    "/_assets_/plugins/revizeCalendar/calendar_data_handler.php",
    source.origin,
  );

  feedUrl.searchParams.set("webspace", "hiram");
  feedUrl.searchParams.set(
    "relative_revize_url",
    "//cms2.revize.com",
  );
  feedUrl.searchParams.set("protocol", "https:");

  return feedUrl.toString();
}

function decodeDescription(value?: string) {
  if (!value) {
    return null;
  }

  let decoded = value;

  try {
    decoded = decodeURIComponent(
      value.replace(/\+/g, " "),
    );
  } catch {
    // Keep the original value if it is not valid URL encoding.
  }

  const $ = cheerio.load(decoded);
  const text = cleanText($.root().text());

  return text || null;
}

function extractImageUrl(
  sourceUrl: string,
  imageHtml?: string,
) {
  if (!imageHtml) {
    return null;
  }

  const $ = cheerio.load(imageHtml);
  const src = $("img").first().attr("src");

  if (
    !src ||
    /placeholder\.png/i.test(src)
  ) {
    return null;
  }

  return toAbsoluteUrl(sourceUrl, src) ?? null;
}

function parseDate(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function isUpcoming(date: Date, now: Date) {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  return date >= startOfToday;
}

export const hiramOfficialScraper: SourceScraper = {
  sourceName: "City of Hiram official site",

  async scrape(source) {
    const feedUrl = buildCalendarFeedUrl(source.url);
    const responseText = await fetchSourceHtml(feedUrl);

    let calendarItems: HiramCalendarItem[];

    try {
      const parsed: unknown = JSON.parse(responseText);

      if (!Array.isArray(parsed)) {
        throw new Error(
          "Hiram calendar response was not an array.",
        );
      }

      calendarItems =
        parsed as HiramCalendarItem[];
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      throw new Error(
        `Unable to parse Hiram calendar JSON: ${message}`,
      );
    }
    
    console.log(
      calendarItems.map((i) => ({
        title: i.title,
        calendar: i.primary_calendar_name,
        start: i.start,
      }))
    );
    
    const now = new Date();
    const events: NormalizedScrapedEvent[] = [];

    for (const item of calendarItems) {
      const title = cleanText(item.title);
      const startDateTime = parseDate(item.start);

      /*
       * Only import public City Events. City Meetings and
       * Municipal Court belong in the Meeting model and can
       * be handled separately later.
       */
      if (
        item.primary_calendar_name !== "City Events" ||
        !title ||
        !startDateTime ||
        !isUpcoming(startDateTime, now)
      ) {
        continue;
      }

      const endDateTime = parseDate(item.end);
      const description = decodeDescription(item.desc);
      const locationName =
        cleanText(item.location) || "City of Hiram";

      const combinedText = [
        title,
        description,
        locationName,
      ]
        .filter(Boolean)
        .join(" ");

      events.push({
        title,
        description,
        startDateTime,
        endDateTime,
        locationName,
        address: null,
        city: "Hiram",
        county: "Paulding",
        category: inferCategory(combinedText),
        tags: ["city event", "official calendar"],
        cost: /free/i.test(combinedText)
          ? "Free"
          : null,
        isFree: /free/i.test(combinedText),
        isKidFriendly:
          /kids|children|child|family|youth|camp/i.test(
            combinedText,
          ),
        isOutdoor:
          /park|outdoor|fireworks|festival|cleanup/i.test(
            combinedText,
          ),
        sourceName: source.name,
        sourceUrl: source.url,
        originalUrl:
          toAbsoluteUrl(source.url, item.url) ??
          source.url,
        imageUrl: extractImageUrl(
          source.url,
          item.image,
        ),
        confidenceScore: 0.92,
      });
    }

    const dedupedEvents =
      dedupeNormalizedEvents(events);

    return {
      events: dedupedEvents,
      status:
        dedupedEvents.length > 0
          ? "SUCCESS"
          : "PARTIAL",
      message:
        dedupedEvents.length > 0
          ? `Parsed ${dedupedEvents.length} upcoming Hiram city events from ${calendarItems.length} calendar records.`
          : `The Hiram feed returned ${calendarItems.length} records, but none were upcoming City Events.`,
    };
  },
};