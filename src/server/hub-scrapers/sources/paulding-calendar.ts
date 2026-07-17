import * as cheerio from "cheerio";
import { addMonths } from "date-fns";

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

function findEventDate(text: string): Date | null {
  /*
   * CivicPlus places a machine-readable date in the event
   * container, such as 2026-07-21T17:00:00.
   */
  const match = text.match(
    /\b(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)\b/,
  );

  if (!match) {
    return null;
  }

  const parsed = new Date(match[1]);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isPastEvent(date: Date, now: Date): boolean {
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  return date < today;
}

function parseCalendarPage(
  html: string,
  pageUrl: string,
  sourceName: string,
  now: Date,
): NormalizedScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: NormalizedScrapedEvent[] = [];

  /*
   * CivicPlus event detail links contain Calendar.aspx?EID=.
   * Finding those links is more reliable than depending on
   * presentation-oriented CSS class names.
   */
  $("a[href]").each((_, anchor) => {
    const href = $(anchor).attr("href");

    if (
      !href ||
      !/calendar\.aspx\?.*eid=/i.test(href)
    ) {
      return;
    }

    const title = cleanText($(anchor).text());

    /*
     * Ignore generic links such as "More Details." The same
     * event normally has a separate link containing its title.
     */
    if (
      !title ||
      /^(more details|view details|details)$/i.test(title)
    ) {
      return;
    }

    const container = $(anchor).closest(
      "li, article, tr, .calendar-item, .calendarItem, .listItem, .item",
    );

    const eventContainer =
      container.length > 0
        ? container
        : $(anchor).parent();

    const containerText = cleanText(eventContainer.text());
    const startDateTime = findEventDate(containerText);

    if (
      !startDateTime ||
      isPastEvent(startDateTime, now)
    ) {
      return;
    }

    const description =
      cleanText(
        eventContainer
          .find(
            ".description, .event-description, .detail-content, p",
          )
          .first()
          .text(),
      ) || null;

    const locationName =
      cleanText(
        eventContainer
          .find(
            ".location, .event-location, .calendarLocation, [class*='location']",
          )
          .first()
          .text(),
      ) || null;

    const combinedText = `${title} ${description ?? ""} ${locationName ?? ""}`;

    events.push({
      title,
      description,
      startDateTime,
      endDateTime: null,
      locationName,
      address: null,
      city: "Paulding County",
      county: "Paulding",
      category: inferCategory(combinedText),
      tags: ["parks", "community calendar"],
      cost: /free/i.test(combinedText) ? "Free" : null,
      isFree: /free/i.test(combinedText),
      isKidFriendly:
        /kids|children|child|family|youth/i.test(
          combinedText,
        ),
      isOutdoor:
        /park|trail|outdoor|field|pavilion|concert/i.test(
          combinedText,
        ),
      sourceName,
      sourceUrl: pageUrl,
      originalUrl:
        toAbsoluteUrl(pageUrl, href) ?? pageUrl,
      confidenceScore: 0.88,
    });
  });

  return events;
}

export const pauldingCalendarScraper: SourceScraper = {
  sourceName: "Paulding County Parks calendar",

  async scrape(source) {
    const now = new Date();
    const events: NormalizedScrapedEvent[] = [];
    const pageErrors: string[] = [];

    /*
     * Check the current month and the next five months so the
     * scraper is not limited to events visible this month.
     */
    for (
      let monthOffset = 0;
      monthOffset < MONTHS_TO_CHECK;
      monthOffset += 1
    ) {
      const month = addMonths(now, monthOffset);
      const pageUrl = buildCalendarUrl(
        source.url,
        month,
      );

      try {
        const html = await fetchSourceHtml(pageUrl);

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