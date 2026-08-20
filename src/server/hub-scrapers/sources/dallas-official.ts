import * as cheerio from "cheerio";

import {
  cleanText,
  dedupeNormalizedEvents,
  fetchSourceHtml,
  inferCategory,
  parseLooseDate,
  toAbsoluteUrl,
} from "@/server/hub-scrapers/helpers";
import type { NormalizedScrapedEvent, SourceScraper } from "@/server/hub-scrapers/types";

const CALENDAR_PATH = "/calendar.aspx?view=list&CID=0";

export function buildDallasCalendarUrl(sourceUrl: string) {
  const url = new URL(sourceUrl);
  url.pathname = "/calendar.aspx";
  url.search = "?view=list&CID=0";
  return url.toString();
}

export function parseDallasCalendarHtml(
  html: string,
  source: { name: string; url: string },
): NormalizedScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: NormalizedScrapedEvent[] = [];

  // CivicEngage calendars render entries in event containers. Keeping this
  // scoped avoids interpreting navigation and calendar-selector list items as
  // events (the old generic `li` selector did exactly that).
  $(".calendarEvent, .calendarEventList, [data-calendar-event], .eventItem").each((_, element) => {
    const node = $(element);
    const titleLink = node.find("a[href*='Calendar.aspx?EID='], a[href*='calendar.aspx?EID=']").first();
    const title = cleanText(titleLink.text() || node.find("h2, h3, .eventTitle").first().text());
    const dateText = cleanText(
      node.find("time, .date, .eventDate, .calendarEventDate, [class*='date']").first().text(),
    );
    const parsedDate = parseLooseDate(dateText);
    if (!title || !parsedDate) return;

    const description = cleanText(node.find(".description, .eventDescription, p").first().text()) || null;
    const location = cleanText(node.find(".location, .eventLocation, [class*='location']").first().text()) || null;
    const originalUrl = toAbsoluteUrl(source.url, titleLink.attr("href")) ?? source.url;
    const combined = `${title} ${description ?? ""} ${location ?? ""}`;

    events.push({
      title,
      description,
      startDateTime: parsedDate,
      locationName: location,
      address: null,
      city: "Dallas",
      county: "Paulding",
      category: inferCategory(combined),
      tags: ["city event"],
      cost: null,
      isFree: /free/i.test(combined),
      isKidFriendly: /kids|family|children|youth/i.test(combined),
      isOutdoor: /park|outdoor|square|downtown/i.test(combined),
      sourceName: source.name,
      sourceUrl: source.url,
      originalUrl,
      confidenceScore: 0.88,
      dateEvidence: {
        listingDate: dateText,
        sourcePublishedText: dateText,
      },
    });
  });

  return dedupeNormalizedEvents(events);
}

export const dallasOfficialScraper: SourceScraper = {
  sourceName: "City of Dallas official events page",
  async scrape(source) {
    const calendarUrl = buildDallasCalendarUrl(source.url);
    const html = await fetchSourceHtml(calendarUrl);
    const $ = cheerio.load(html);

    if (/Custom404/i.test($("title").text()) || $("#404Content").length > 0) {
      return {
        events: [],
        status: "PARTIAL",
        message: `The official Dallas calendar returned a not-found page (${CALENDAR_PATH}).`,
      };
    }

    const events = parseDallasCalendarHtml(html, { name: source.name, url: calendarUrl });
    return {
      events,
      status: events.length > 0 ? "SUCCESS" : "PARTIAL",
      message: events.length > 0
        ? `Parsed ${events.length} Dallas event(s) from the official city calendar.`
        : "The official Dallas calendar loaded successfully but currently contained no detectable event entries.",
    };
  },
};
