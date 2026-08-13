import * as cheerio from "cheerio";
import {
  addMonths,
  isValid,
  parse,
} from "date-fns";

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

const MONTHS_TO_CHECK = 6;

const GENERIC_LINK_TEXT =
  /^(calendar|more details|view details|details|read more|learn more)$/i;

function buildCalendarUrl(
  sourceUrl: string,
  date: Date,
): string {
  const url = new URL(sourceUrl);

  url.searchParams.set("view", "list");
  url.searchParams.set(
    "month",
    String(date.getMonth() + 1),
  );
  url.searchParams.set(
    "year",
    String(date.getFullYear()),
  );

  return url.toString();
}

function normalizeDateText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function findEventDate(text: string): Date | null {
  const normalizedText = normalizeDateText(text);

  /*
   * First try the machine-readable CivicPlus date that may be
   * stored in hidden text or data attributes.
   */
  const isoMatch = normalizedText.match(
    /\b(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)\b/,
  );

  if (isoMatch) {
    const parsedIso = new Date(isoMatch[1]);

    if (!Number.isNaN(parsedIso.getTime())) {
      return parsedIso;
    }
  }

  /*
   * CivicPlus list view normally displays dates like:
   *
   * July 28, 2026, 10:00 AM - 11:00 AM
   */
  const readableMatch = normalizedText.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+20\d{2},?\s+\d{1,2}:\d{2}\s*(?:AM|PM)\b/i,
  );

  if (!readableMatch) {
    return null;
  }

  const dateText = readableMatch[0].replace(
    /,\s+(?=\d{1,2}:\d{2})/,
    " ",
  );

  const parsedDate = parse(
    dateText,
    "MMMM d, yyyy h:mm a",
    new Date(),
  );

  return isValid(parsedDate)
    ? parsedDate
    : null;
}

function findEventEndDate(
  text: string,
  startDateTime: Date,
): Date | null {
  const normalizedText = normalizeDateText(text);

  const timeRangeMatch = normalizedText.match(
    /\b\d{1,2}:\d{2}\s*(?:AM|PM)\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))\b/i,
  );

  if (!timeRangeMatch) {
    return null;
  }

  const endTime = parse(
    timeRangeMatch[1],
    "h:mm a",
    startDateTime,
  );

  if (!isValid(endTime)) {
    return null;
  }

  /*
   * Preserve the event's calendar date because date-fns parse()
   * uses the provided start date as its reference.
   */
  return new Date(
    startDateTime.getFullYear(),
    startDateTime.getMonth(),
    startDateTime.getDate(),
    endTime.getHours(),
    endTime.getMinutes(),
  );
}

function isPastEvent(
  date: Date,
  now: Date,
): boolean {
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  return date < today;
}

function getEventIdFromHref(
  href: string,
  pageUrl: string,
): string | null {
  try {
    const url = new URL(href, pageUrl);

    return (
      url.searchParams.get("EID") ??
      url.searchParams.get("eid")
    );
  } catch {
    const match = href.match(/[?&]eid=(\d+)/i);

    return match?.[1] ?? null;
  }
}

function findBestTitle(
  $: cheerio.CheerioAPI,
  eventId: string,
  pageUrl: string,
): string | null {
  const candidates: string[] = [];

  $("a[href]").each((_, anchor) => {
    const href = $(anchor).attr("href");

    if (
      !href ||
      getEventIdFromHref(href, pageUrl) !== eventId
    ) {
      return;
    }

    const text = cleanText($(anchor).text());

    if (
      text &&
      !GENERIC_LINK_TEXT.test(text)
    ) {
      candidates.push(text);
    }

    /*
     * CivicPlus usually places the actual event link inside a
     * heading element.
     */
    const headingText = cleanText(
      $(anchor)
        .closest("h1, h2, h3, h4, h5, h6")
        .text(),
    );

    if (
      headingText &&
      !GENERIC_LINK_TEXT.test(headingText)
    ) {
      candidates.push(headingText);
    }

    const titleAttribute = cleanText(
      $(anchor).attr("title") ?? "",
    );

    if (
      titleAttribute &&
      !GENERIC_LINK_TEXT.test(titleAttribute)
    ) {
      candidates.push(titleAttribute);
    }
  });

  const uniqueCandidates = [
    ...new Set(candidates),
  ].filter(
    (candidate) =>
      candidate.length >= 3 &&
      candidate.length <= 250,
  );

  if (uniqueCandidates.length === 0) {
    return null;
  }

  /*
   * Prefer meaningful titles over short navigation labels.
   */
  return uniqueCandidates.sort(
    (left, right) =>
      right.length - left.length,
  )[0];
}

function findEventContainer(
  $: cheerio.CheerioAPI,
  anchor: cheerio.Cheerio<any>,
): cheerio.Cheerio<any> {
  const selectors = [
    "li",
    "article",
    ".calendarEvent",
    ".calendar-event",
    ".calendar-item",
    ".calendarItem",
    ".listItem",
    ".event",
    "tr",
  ];

  for (const selector of selectors) {
    const candidate = anchor.closest(selector);

    if (
      candidate.length > 0 &&
      findEventDate(candidate.text())
    ) {
      return candidate.first();
    }
  }

  let candidate = anchor.parent();

  for (
    let level = 0;
    level < 5 && candidate.length > 0;
    level += 1
  ) {
    if (findEventDate(candidate.text())) {
      return candidate.first();
    }

    candidate = candidate.parent();
  }

  return anchor.parent();
}

function findDescription(
  eventContainer: cheerio.Cheerio<any>,
  title: string,
): string | null {
  const preferredDescription = cleanText(
    eventContainer
      .find(
        [
          ".description",
          ".event-description",
          ".detail-content",
          ".calendarDescription",
          "[class*='description']",
        ].join(", "),
      )
      .first()
      .text(),
  );

  if (
    preferredDescription &&
    preferredDescription !== title
  ) {
    return preferredDescription;
  }

  const paragraphs = eventContainer
    .find("p")
    .toArray()
    .map((element) =>
      cleanText(eventContainer.find(element).text()),
    )
    .filter(
      (text) =>
        text &&
        text !== title &&
        !GENERIC_LINK_TEXT.test(text) &&
        !findEventDate(text),
    );

  return paragraphs[0] ?? null;
}

function findLocation(
  eventContainer: cheerio.Cheerio<any>,
  title: string,
): string | null {
  const location = cleanText(
    eventContainer
      .find(
        [
          ".location",
          ".event-location",
          ".calendarLocation",
          "[class*='location']",
          "[itemprop='location']",
        ].join(", "),
      )
      .first()
      .text(),
  );

  if (
    location &&
    location !== title &&
    location !== "@"
  ) {
    return location.replace(/^@\s*/, "");
  }

  /*
   * Some CivicPlus calendars display the venue immediately
   * after a standalone "@" marker.
   */
  const lines = eventContainer
    .text()
    .split(/\n+/)
    .map((line) => cleanText(line))
    .filter(Boolean);

  const atIndex = lines.findIndex(
    (line) => line === "@",
  );

  if (
    atIndex >= 0 &&
    lines[atIndex + 1] &&
    lines[atIndex + 1] !== title
  ) {
    return lines[atIndex + 1];
  }

  return null;
}

export function parseCalendarPage(
  html: string,
  pageUrl: string,
  sourceName: string,
  now: Date,
): NormalizedScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: NormalizedScrapedEvent[] = [];
  const processedEventIds = new Set<string>();

  $("a[href]").each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr("href");

    if (
      !href ||
      !/calendar\.aspx\?.*eid=/i.test(href)
    ) {
      return;
    }

    const eventId = getEventIdFromHref(
      href,
      pageUrl,
    );

    if (
      !eventId ||
      processedEventIds.has(eventId)
    ) {
      return;
    }

    processedEventIds.add(eventId);

    const title = findBestTitle(
      $,
      eventId,
      pageUrl,
    );

    if (
      !title ||
      GENERIC_LINK_TEXT.test(title)
    ) {
      return;
    }

    const eventContainer = findEventContainer(
      $,
      anchor,
    );

    const containerText = cleanText(
      eventContainer.text(),
    );

    const startDateTime =
      findEventDate(containerText);

    if (
      !startDateTime ||
      isPastEvent(startDateTime, now)
    ) {
      return;
    }

    const endDateTime = findEventEndDate(
      containerText,
      startDateTime,
    );

    const description = findDescription(
      eventContainer,
      title,
    );

    const locationName = findLocation(
      eventContainer,
      title,
    );

    const combinedText = [
      title,
      description,
      locationName,
    ]
      .filter(Boolean)
      .join(" ");

    const originalUrl =
      toAbsoluteUrl(pageUrl, href) ??
      pageUrl;

    events.push({
      title,
      description,
      startDateTime,
      endDateTime,
      locationName,
      address: null,
      city: "Dallas",
      county: "Paulding",
      category: inferCategory(combinedText),
      tags: [
        "Paulding County",
        "community calendar",
      ],
      cost: /free/i.test(combinedText)
        ? "Free"
        : null,
      isFree: /free/i.test(combinedText),
      isKidFriendly:
        /kids|children|child|family|youth|puppet/i.test(
          combinedText,
        ),
      isOutdoor:
        /park|trail|outdoor|field|pavilion|concert/i.test(
          combinedText,
        ),
      sourceName,
      sourceUrl: pageUrl,
      originalUrl,
      confidenceScore:
        description || locationName
          ? 0.93
          : 0.9,
      dateEvidence: {
        // This value was parsed from the visible, official CivicPlus
        // listing. Retain both the normalized value and the exact listing
        // text so verification remains auditable after the scrape.
        listingDate: startDateTime,
        sourcePublishedText: containerText,
      },
    });
  });

  return events;
}

export const pauldingCalendarScraper: SourceScraper = {
  sourceName: "Paulding County Public Calendar",

  async scrape(source) {
    const now = new Date();
    const events: NormalizedScrapedEvent[] = [];
    const pageErrors: string[] = [];

    for (
      let monthOffset = 0;
      monthOffset < MONTHS_TO_CHECK;
      monthOffset += 1
    ) {
      const month = addMonths(
        now,
        monthOffset,
      );

      const pageUrl = buildCalendarUrl(
        source.url,
        month,
      );

      try {
        const html =
          await fetchSourceHtml(pageUrl);

        events.push(
          ...parseCalendarPage(
            html,
            pageUrl,
            source.name,
            now,
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        pageErrors.push(
          `${month.getFullYear()}-${String(
            month.getMonth() + 1,
          ).padStart(2, "0")}: ${message}`,
        );
      }
    }

    const dedupedEvents =
      dedupeNormalizedEvents(events);

    if (
      dedupedEvents.length === 0 &&
      pageErrors.length > 0
    ) {
      return {
        events: [],
        status: "PARTIAL",
        message:
          "No Paulding events were parsed, and one or more calendar pages failed.",
      };
    }

    if (dedupedEvents.length === 0) {
      return {
        events: [],
        status: "PARTIAL",
        message:
          "The Paulding calendar was reached, but no upcoming event entries were detected.",
      };
    }

    return {
      events: dedupedEvents,
      status:
        pageErrors.length > 0
          ? "PARTIAL"
          : "SUCCESS",
      message: `Parsed ${dedupedEvents.length} upcoming Paulding calendar events across ${MONTHS_TO_CHECK} months.`,
    };
  },
};
